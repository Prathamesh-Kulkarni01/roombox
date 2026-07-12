// Declarations for side-effect imports forced by TS 7 strict mode
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@/ai/flows/*' {
  const content: any;
  export default content;
}
