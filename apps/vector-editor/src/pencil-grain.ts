import { cancelPaperContactPreparation } from "./paper-contact-preparation";
import { createPaperContactMaterial, hasPaperContactData } from "./paper-contact-material";

export function pencilMaterial() {
  if (!hasPaperContactData()) cancelPaperContactPreparation();
  return createPaperContactMaterial();
}

export function pencilDeposits() {
  return pencilMaterial().data;
}

/** Immutable graphite-response layers, shared by every pencil stroke. */
export class PencilGrain {
  private texture: WebGLTexture | null = null;
  textureBytes = 0;
  private materialUploaded = false;
  constructor(private gl: WebGL2RenderingContext) {}
  bind(requireMaterial = true) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE2);
    if (!this.texture || (requireMaterial && !this.materialUploaded)) {
      const texture = this.texture ?? gl.createTexture();
      if (!texture) throw Error("Could not prepare paper-contact material.");
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      if (!requireMaterial) {
        // Complete sampler for Ink/empty frames; pencil fragments never use this texture.
        gl.texImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          gl.R8,
          1,
          1,
          1,
          0,
          gl.RED,
          gl.UNSIGNED_BYTE,
          new Uint8Array(1),
        );
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.texture = texture;
        this.textureBytes = 1;
        gl.activeTexture(gl.TEXTURE0);
        return;
      }
      const material = pencilMaterial();
      gl.texImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        gl.R8,
        material.size,
        material.size,
        material.levels,
        0,
        gl.RED,
        gl.UNSIGNED_BYTE,
        material.data,
      );
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      this.texture = texture;
      this.materialUploaded = true;
      this.textureBytes = (material.levels * (4 * material.size * material.size - 1)) / 3;
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.activeTexture(gl.TEXTURE0);
  }
}
