declare type EasingFunction = (t: number) => number;
export interface TransitionConfig {
    delay?: number;
    duration?: number;
    easing?: EasingFunction;
    css?: (t: number, u: number) => string;
    tick?: (t: number, u: number) => void;
}
interface BlurParams {
    delay: number;
    duration: number;
    easing?: EasingFunction;
    amount: number;
    opacity: number;
}
export declare function blur(node: Element, { delay, duration, easing, amount, opacity }: BlurParams): TransitionConfig;
interface FadeParams {
    delay: number;
    duration: number;
    easing: EasingFunction;
}
export declare function fade(node: Element, { delay, duration, easing }: FadeParams): TransitionConfig;
interface FlyParams {
    delay: number;
    duration: number;
    easing: EasingFunction;
    x: number;
    y: number;
    opacity: number;
}
export declare function fly(node: Element, { delay, duration, easing, x, y, opacity }: FlyParams): TransitionConfig;
interface SlideParams {
    delay: number;
    duration: number;
    easing: EasingFunction;
}
export declare function slide(node: Element, { delay, duration, easing }: SlideParams): TransitionConfig;
interface ScaleParams {
    delay: number;
    duration: number;
    easing: EasingFunction;
    start: number;
    opacity: number;
}
export declare function scale(node: Element, { delay, duration, easing, start, opacity }: ScaleParams): TransitionConfig;
interface DrawParams {
    delay: number;
    speed: number;
    duration: number | ((len: number) => number);
    easing: EasingFunction;
}
export declare function draw(node: SVGElement & {
    getTotalLength(): number;
}, { delay, speed, duration, easing }: DrawParams): TransitionConfig;
interface CrossfadeParams {
    delay: number;
    duration: number | ((len: number) => number);
    easing: EasingFunction;
}
export declare function crossfade({ fallback, ...defaults }: CrossfadeParams & {
    fallback: (node: Element, params: CrossfadeParams, intro: boolean) => TransitionConfig;
}): ((node: Element, params: CrossfadeParams & {
    key: any;
}) => () => TransitionConfig)[];
export {};
