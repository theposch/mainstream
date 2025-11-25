declare module 'get-image-colors' {
  interface Color {
    hex(): string;
    rgb(): number[];
  }

  interface Options {
    count?: number;
    type?: string;
  }

  function getColors(
    input: string | Buffer,
    options?: string | Options
  ): Promise<Color[]>;

  export = getColors;
}

