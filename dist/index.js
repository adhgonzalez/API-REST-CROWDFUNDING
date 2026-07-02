"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add = add;
/**
 * Suma de números
 * @param firstNumber - Primer número con el que se realizara la suma
 * @param secondNumber - Segundo número con el que se realizara la suma
 * @param remainingNumbers - Una lista de __numbers__ para poder hacer la suma con mas números
 * @returns La suma de todos los números introducidos como argumento
 * ```typescript
 * add(1, 7) = 8
 * add(3, -2) = 1
 * add(1, 2, 3) = 6
 * ```
 */
function add(firstNumber, secondNumber, ...remainingNumbers) {
    let result = firstNumber + secondNumber;
    if (remainingNumbers.length) {
        result += remainingNumbers.reduce((prev, current) => prev + current);
    }
    return result;
}
console.log(add(1, 2));
console.log(add(1, 2, 3));
console.log(add(1, 2, 4));
