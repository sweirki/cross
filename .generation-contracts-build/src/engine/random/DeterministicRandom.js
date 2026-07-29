"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicRandom = void 0;
exports.hashSeed = hashSeed;
function assertSafeInteger(value, name) {
    if (!Number.isSafeInteger(value)) {
        throw new Error(`${name} must be a safe integer.`);
    }
}
function hashSeed(value) {
    const input = String(value);
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
class DeterministicRandom {
    seed;
    state;
    constructor(seed) {
        assertSafeInteger(seed, "seed");
        this.seed = seed >>> 0;
        this.state = this.seed;
    }
    nextUint32() {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let value = this.state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return (value ^ (value >>> 14)) >>> 0;
    }
    nextFloat() {
        return this.nextUint32() / 0x100000000;
    }
    nextInt(minimum, maximum) {
        assertSafeInteger(minimum, "minimum");
        assertSafeInteger(maximum, "maximum");
        if (maximum < minimum) {
            throw new Error("maximum must not be smaller than minimum.");
        }
        const span = maximum - minimum + 1;
        return minimum + Math.floor(this.nextFloat() * span);
    }
    shuffle(values) {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index -= 1) {
            const swapIndex = this.nextInt(0, index);
            const temporary = result[index];
            result[index] = result[swapIndex];
            result[swapIndex] = temporary;
        }
        return result;
    }
    fork(label) {
        return new DeterministicRandom(hashSeed(`${this.seed}:${String(label)}`));
    }
}
exports.DeterministicRandom = DeterministicRandom;
