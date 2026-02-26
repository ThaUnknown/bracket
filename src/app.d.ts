/* eslint-disable @typescript-eslint/method-signature-style */
// See https://svelte.dev/docs/kit/types#app.d.ts

import type { CompositionEventHandler } from 'svelte/elements'

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

declare global {
  /**
   * The possible types of barcode format that can be detected using the
   * Barcode Detection API. This list may change in the future.
   * Adapted from: https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
   */
  type BarcodeFormat = 'aztec'
    | 'code_128'
    | 'code_39'
    | 'code_93'
    | 'codabar'
    | 'data_matrix'
    | 'ean_13'
    | 'ean_8'
    | 'itf'
    | 'pdf417'
    | 'qr_code'
    | 'upc_a'
    | 'upc_e'
    | 'unknown'

  /**
   * The return type of the Barcode Detect API `detect` function that
   * describes a barcode that has been recognized by the API.
   */
  interface DetectedBarcode {
    /**
     * A DOMRectReadOnly, which returns the dimensions of a rectangle
     * representing the extent of a detected barcode, aligned with the
     * image
     */
    boundingBox: DOMRectReadOnly
    /**
     * The x and y co-ordinates of the four corner points of the detected
     * barcode relative to the image, starting with the top left and working
     * clockwise. This may not be square due to perspective distortions
     * within the image.
     */
    cornerPoints: {
      x: number
      y: number
    }[4]
    /**
     * The detected barcode format
     */
    format: BarcodeFormat

    /**
     * A string decoded from the barcode data
     */
    rawValue: string
  }

  /**
   * Options for describing how a BarcodeDetector should be initialised
   */
  interface BarcodeDetectorOptions {
    /**
     * Which formats the barcode detector should detect
     */
    formats: BarcodeFormat[]
  }

  /**
   * The BarcodeDetector interface of the Barcode Detection API allows
   * detection of linear and two dimensional barcodes in images.
   */
  class BarcodeDetector {
    /**
     * Initialize a Barcode Detector instance
     */
    constructor(options?: BarcodeDetectorOptions): BarcodeDetector

    /**
     * Retrieve the formats that are supported by the detector
     */
    static getSupportedFormats(): Promise<BarcodeFormat[]>

    /**
     * Attempt to detect barcodes from an image source
     */
    public detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
  }

  interface SanitizerConfig {
    allowElements?: string[]
    blockElements?: string[]
    dropElements?: string[]
    allowAttributes?: Record<string, string[]>
    dropAttributes?: Record<string, string[]>
    allowCustomElements?: boolean
    allowComments?: boolean
  }

  class Sanitizer {
    constructor(opts?: SanitizerConfig)
    allowElement(name: string): boolean
    get(): SanitizerConfig
    removeElement(name: string): void
    removeUnsafe()
    allowAttribute(name: string, elementName: string): boolean
    removeAttribute(name: string, elementName: string): void
    setComments(allow: boolean): void
    setDataAttributes(allow: boolean): void
  }

  // Also add the class to the window so we can do feature detection
  interface Window {
    BarcodeDetector: BarcodeDetector
    Sanitizer: Sanitizer
  }

  interface Element {
    setHTML(html: string, options?: { sanitizer?: Sanitizer }): void
    setHTMLUnsafe(html: string | TrustedHTML, options?: { sanitizer?: Sanitizer }): void
  }

  declare interface Navigator extends NavigatorNetworkInformation {}
  declare interface WorkerNavigator extends NavigatorNetworkInformation {}

  // http://wicg.github.io/netinfo/#navigatornetworkinformation-interface
  declare interface NavigatorNetworkInformation {
    readonly connection?: NetworkInformation
  }

  // http://wicg.github.io/netinfo/#connection-types
  type ConnectionType =
    | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'mixed'
    | 'none'
    | 'other'
    | 'unknown'
    | 'wifi'
    | 'wimax'

  // http://wicg.github.io/netinfo/#effectiveconnectiontype-enum
  type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g'

  // http://wicg.github.io/netinfo/#dom-megabit
  type Megabit = number
  // http://wicg.github.io/netinfo/#dom-millisecond
  type Millisecond = number

  // http://wicg.github.io/netinfo/#networkinformation-interface
  interface NetworkInformation extends EventTarget {
    // http://wicg.github.io/netinfo/#type-attribute
    readonly type?: ConnectionType
    // http://wicg.github.io/netinfo/#effectivetype-attribute
    readonly effectiveType?: EffectiveConnectionType
    // http://wicg.github.io/netinfo/#downlinkmax-attribute
    readonly downlinkMax?: Megabit
    // http://wicg.github.io/netinfo/#downlink-attribute
    readonly downlink?: Megabit
    // http://wicg.github.io/netinfo/#rtt-attribute
    readonly rtt?: Millisecond
    // http://wicg.github.io/netinfo/#savedata-attribute
    readonly saveData?: boolean
    // http://wicg.github.io/netinfo/#handling-changes-to-the-underlying-connection
    onchange?: EventListener
}

  // Base64 helpers from the Uint8Array proposal.
  interface Uint8Array {
    toBase64(options?: {
      alphabet?: 'base64' | 'base64url'
      omitPadding?: boolean
    }): string
  }

  interface Uint8ArrayConstructor {
    fromBase64(base64: string, options?: {
      alphabet?: 'base64' | 'base64url'
      lastChunkHandling?: 'loose' | 'strict' | 'stop-before-partial'
    }): Uint8Array<ArrayBuffer>
  }

    declare namespace svelteHTML {
    interface HTMLAttributes<T> {
      'on:navigate'?: CompositionEventHandler<T>
      credentialless?: boolean
    }
  }
}

export {}
