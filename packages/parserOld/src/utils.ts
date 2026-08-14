export const lowerFirstLetter = (source: string) => source[0].toLocaleLowerCase() + source.slice(1);

export const upperFirstLetter = (source: string) => source[0].toLocaleUpperCase() + source.slice(1);

export const camelize = (source: string) => source.replace(/[-|_]./g, (x) => x[1].toUpperCase());

export const compose = <R>(...fns: Array<(a: R) => R>) => (x: R) => fns.reduce((v, f) => f(v), x);

export const removeLineBreak = (source: string) => source.replace(/\n/g, '');

export const insertString = (source: string, index: number, add: string) =>
    source.substring(0, index) + add + source.substring(index, source.length);

export const sleep = async (seconds: number) => new Promise((r) => setTimeout(r, seconds));

export const getSalt = () => Math.random().toString(32).split('.')[1];
