import {
  jsonRpcCodeInternalError,
  jsonRpcCodeInvalidParams,
  jsonRpcCodeInvalidRequest,
  jsonRpcCodeMethodNotFound,
  jsonRpcCodeParseError,
  jsonRpcCodeServerErrorDefault,
  SimpleMessagingConnection,
} from "@iov/jsonrpc";
import { firstEvent } from "@iov/stream";

// An RPC interface very similar to JSON-RPC but supporting
// all the data types from the structured clone algorithm
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#Supported_types

/** A single structured clone algorithm compatible value */
export declare type JsRpcCompatibleValue =
  | string
  | number
  | boolean
  | null
  | Uint8Array
  | JsRpcCompatibleArray
  | JsRpcCompatibleDictionary;

/** An array of JsRpcCompatibleValue */
export interface JsRpcCompatibleArray extends ReadonlyArray<JsRpcCompatibleValue> {}

/** A string to JsRpcCompatibleValue dictionary. */
export interface JsRpcCompatibleDictionary {
  readonly [key: string]: JsRpcCompatibleValue;
}

export function isJsRpcCompatibleValue(value: unknown): value is JsRpcCompatibleValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value instanceof Uint8Array ||
    isJsRpcCompatibleArray(value) ||
    isJsRpcCompatibleDictionary(value)
  );
}

export function isJsRpcCompatibleArray(value: unknown): value is JsRpcCompatibleArray {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(isJsRpcCompatibleValue);
}

export function isJsRpcCompatibleDictionary(data: unknown): data is JsRpcCompatibleDictionary {
  if (typeof data !== "object" || data === null) {
    // data must be a non-null object
    return false;
  }

  // Exclude special kind of objects like Array, Date or Uint8Array
  // Object.prototype.toString() returns a specified value:
  // http://www.ecma-international.org/ecma-262/7.0/index.html#sec-object.prototype.tostring
  if (Object.prototype.toString.call(data) !== "[object Object]") {
    return false;
  }

  // replace with Object.values when available (ES2017+)
  const values = Object.getOwnPropertyNames(data).map(key => (data as any)[key]);
  return values.every(isJsRpcCompatibleValue);
}

export interface JsRpcRequest {
  readonly id: number;
  readonly method: string;
  readonly params: JsRpcCompatibleArray | JsRpcCompatibleDictionary;
}

export interface JsRpcSuccessResponse {
  readonly id: number;
  readonly result: any;
}

export interface JsRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: JsRpcCompatibleValue;
}

/**
 * And error object as described in https://www.jsonrpc.org/specification#error_object
 */
export interface JsRpcErrorResponse {
  readonly id: number | null;
  readonly error: JsRpcError;
}

export type JsRpcResponse = JsRpcSuccessResponse | JsRpcErrorResponse;

export function isJsRpcErrorResponse(response: JsRpcResponse): response is JsRpcErrorResponse {
  return typeof (response as JsRpcErrorResponse).error === "object";
}

export const jsRpcCode = {
  parseError: jsonRpcCodeParseError,
  invalidRequest: jsonRpcCodeInvalidRequest,
  methodNotFound: jsonRpcCodeMethodNotFound,
  invalidParams: jsonRpcCodeInvalidParams,
  internalError: jsonRpcCodeInternalError,
  serverErrorDefault: jsonRpcCodeServerErrorDefault,
};

export function parseJsRpcId(data: unknown): number | null {
  if (!isJsRpcCompatibleDictionary(data)) {
    throw new Error("Data must be JS RPC compatible dictionary");
  }

  const id = data.id;
  if (typeof id !== "number") {
    return null;
  }
  return id;
}

export function parseJsRpcRequest(data: unknown): JsRpcRequest {
  if (!isJsRpcCompatibleDictionary(data)) {
    throw new Error("Data must be JS RPC compatible dictionary");
  }

  const id = parseJsRpcId(data);
  if (id === null) {
    throw new Error("Invalid id field");
  }

  const method = data.method;
  if (typeof method !== "string") {
    throw new Error("Invalid method field");
  }

  if (!isJsRpcCompatibleArray(data.params) && !isJsRpcCompatibleDictionary(data.params)) {
    throw new Error("Invalid params field");
  }

  return {
    id: id,
    method: method,
    params: data.params,
  };
}

function parseError(error: JsRpcCompatibleDictionary): JsRpcError {
  if (typeof error.code !== "number") {
    throw new Error("Error property 'code' is not a number");
  }

  if (typeof error.message !== "string") {
    throw new Error("Error property 'message' is not a string");
  }

  let maybeUndefinedData: JsRpcCompatibleValue | undefined;

  if (error.data === undefined) {
    maybeUndefinedData = undefined;
  } else if (isJsRpcCompatibleValue(error.data)) {
    maybeUndefinedData = error.data;
  } else {
    throw new Error("Error property 'data' is defined but not a JS RPC compatible value.");
  }

  return {
    code: error.code,
    message: error.message,
    data: maybeUndefinedData,
  };
}

export function parseJsRpcErrorResponse(data: unknown): JsRpcErrorResponse | undefined {
  if (!isJsRpcCompatibleDictionary(data)) {
    throw new Error("Data must be JS RPC compatible dictionary");
  }

  const id = parseJsRpcId(data);
  if (id === null) {
    throw new Error("Invalid id field");
  }

  if (typeof data.error === "undefined") {
    return undefined;
  }

  if (!isJsRpcCompatibleDictionary(data.error)) {
    throw new Error("Property 'error' is defined but not a JS RPC compatible dictionary");
  }

  return {
    id: id,
    error: parseError(data.error),
  };
}

export function parseJsRpcResponse(data: unknown): JsRpcSuccessResponse {
  if (!isJsRpcCompatibleDictionary(data)) {
    throw new Error("Data must be JS RPC compatible dictionary");
  }

  const id = parseJsRpcId(data);
  if (id === null) {
    throw new Error("Invalid id field");
  }

  const result = data.result;

  return {
    id: id,
    result: result,
  };
}

export class JsRpcClient {
  private readonly connection: SimpleMessagingConnection<JsRpcRequest, JsRpcResponse>;

  constructor(connection: SimpleMessagingConnection<JsRpcRequest, JsRpcResponse>) {
    this.connection = connection;
  }

  public async run(request: JsRpcRequest): Promise<JsRpcSuccessResponse> {
    const filteredStream = this.connection.responseStream.filter(r => r.id === request.id);
    const pendingResponses = firstEvent(filteredStream);
    this.connection.sendRequest(request);

    const response = await pendingResponses;
    if (isJsRpcErrorResponse(response)) {
      const error = response.error;
      throw new Error(`JS RPC error: code=${error.code}; message='${error.message}'`);
    }

    return response;
  }
}