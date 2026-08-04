import assert from "node:assert/strict";
import { pageCount } from "./pagination.js";

assert.equal(pageCount(0, 12), 1);
assert.equal(pageCount(12, 12), 1);
assert.equal(pageCount(13, 12), 2);
console.log("pagination checks passed");
