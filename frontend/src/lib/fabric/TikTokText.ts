import * as fabric from 'fabric';

/**
 * TikTokText - Custom Fabric.js text class with per-line background rendering
 *
 * Extends Textbox (not IText) to enable automatic word wrapping.
 * Renders TikTok/Instagram-style text where each line gets its own
 * rounded rectangle background, rather than one box around all text.
 */

export interface TikTokTextOptions extends Partial<fabric.TextboxProps> {
  customBackgroundColor?: string | null;
  textBackgroundPadding?: { x: number; y: number };
  textBackgroundRadius?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  data?: Record<string, unknown>;
}

export class TikTokText extends fabric.Textbox {
  // Use a different name to avoid collision with type property
  static override type = 'TikTokText';

  declare customBackgroundColor: string | null;
  declare textBackgroundPadding: { x: number; y: number };
  declare textBackgroundRadius: number;
  declare verticalAlign: 'top' | 'middle' | 'bottom';
  declare data: Record<string, unknown>;

  constructor(text: string, options?: TikTokTextOptions) {
    // Don't pass textBackgroundColor to parent - we use our own customBackgroundColor
    const { customBackgroundColor, verticalAlign, ...fabricOptions } = options ?? {};

    // Default width for word wrapping - 80% of typical canvas width
    const defaultWidth = fabricOptions.width ?? 320;

    super(text, { ...fabricOptions, width: defaultWidth } as fabric.TextboxProps);

    this.customBackgroundColor = customBackgroundColor ?? null;
    this.verticalAlign = verticalAlign ?? 'middle';
    this.textBackgroundPadding = options?.textBackgroundPadding ?? {
      x: 0.4,
      y: 0.15,
    };
    this.textBackgroundRadius = options?.textBackgroundRadius ?? 0.15;
    this.data = options?.data ?? {};
  }

  /**
   * Getter/setter alias for backward compatibility with property name 'textBackgroundColor'
   */
  get tiktokBgColor(): string | null {
    return this.customBackgroundColor;
  }

  set tiktokBgColor(value: string | null) {
    this.customBackgroundColor = value;
  }

  /**
   * Override to render per-line backgrounds before text
   */
  _render(ctx: CanvasRenderingContext2D): void {
    this._renderTextLinesBackground(ctx);
    super._render(ctx);
  }

  /**
   * Render individual rounded rectangle backgrounds for each line
   * Matches the TikTok/Instagram text style
   */
  _renderTextLinesBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.customBackgroundColor) {
      return;
    }

    const lines = this._textLines;
    if (!lines || lines.length === 0) {
      return;
    }

    ctx.save();
    ctx.fillStyle = this.customBackgroundColor;

    const fontSize = this.fontSize || 40;
    const lineHeight = this.lineHeight || 1.3;
    // Padding values
    const paddingX = fontSize * 0.2;
    const paddingY = fontSize * 0.15;
    const radius = fontSize * 0.1;

    // Use Fabric's internal method to get line top positions
    const textHeight = this.calcTextHeight();
    const startY = -textHeight / 2;

    lines.forEach((line, index) => {
      const lineText = line.join ? line.join('') : String(line);

      if (!lineText.trim()) {
        return;
      }

      // Measure line width using Fabric's method
      const lineWidth = this.measureLine(index).width;

      // Get the Y position for this specific line
      const lineTopOffset = this.getHeightOfLine(index);
      let lineY = startY;
      for (let i = 0; i < index; i++) {
        lineY += this.getHeightOfLine(i);
      }

      // Calculate X position based on text alignment
      let lineX = -lineWidth / 2; // Default: center
      if (this.textAlign === 'left') {
        lineX = -(this.width || 0) / 2;
      } else if (this.textAlign === 'right') {
        lineX = (this.width || 0) / 2 - lineWidth;
      }

      // Background dimensions
      const bgWidth = lineWidth + paddingX * 2;
      const bgHeight = fontSize * lineHeight;
      const bgX = lineX - paddingX;
      // Center the background vertically on the line
      const bgY = lineY + (lineTopOffset - bgHeight) / 2;

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Include custom properties in JSON serialization
   */
  toObject<
    T extends Omit<
      Partial<fabric.TextboxProps> & { data?: Record<string, unknown> },
      keyof fabric.SerializedTextboxProps
    >,
    K extends keyof T = never,
  >(propertiesToInclude?: K[]): Pick<T, K> & fabric.SerializedTextboxProps {
    const base = super.toObject(propertiesToInclude as never[]);
    return {
      ...base,
      customBackgroundColor: this.customBackgroundColor,
      textBackgroundPadding: this.textBackgroundPadding,
      textBackgroundRadius: this.textBackgroundRadius,
      verticalAlign: this.verticalAlign,
      data: this.data,
    } as unknown as Pick<T, K> & fabric.SerializedTextboxProps;
  }

  /**
   * Create instance from object - typed to match Fabric.js expectations
   * Using any to work around Fabric.js complex generic constraints
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static override fromObject(object: Record<string, unknown>): Promise<any> {
    return Promise.resolve(
      new TikTokText(object.text as string, object as unknown as TikTokTextOptions)
    );
  }
}

// Register the custom class with Fabric.js
fabric.classRegistry.setClass(TikTokText);
fabric.classRegistry.setSVGClass(TikTokText);
