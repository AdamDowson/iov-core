import { lineCount } from "./helpers";

describe("Helpers", () => {
  it("has working line count", () => {
    expect(lineCount("")).toEqual(0);
    expect(lineCount("123\n")).toEqual(1);
    expect(lineCount("\n")).toEqual(1);
    expect(lineCount("123\nabc\n")).toEqual(2);
    expect(lineCount("123\n\nabc\n")).toEqual(3);
  });
});
