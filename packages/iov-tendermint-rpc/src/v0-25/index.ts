import { Adaptor } from "../adaptor";
import { hashTx } from "./hasher";
import { Params } from "./requests";
import { Responses } from "./responses";

// tslint:disable-next-line:variable-name
export const v0_25: Adaptor = {
  params: Params,
  responses: Responses,
  hashTx: hashTx,
};
