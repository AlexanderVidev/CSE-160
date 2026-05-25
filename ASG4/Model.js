class Model {
  constructor(objPath, fallbackOBJText) {
    this.objPath = objPath;
    this.color = [0.86, 0.62, 0.32, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1;
    this.forceColor = false;
    this.loaded = false;
    this.error = null;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.uvBuffer = null;
    this.numVertices = 0;
    this.fallbackOBJText = fallbackOBJText || null;

    // Load from the embedded OBJ text first so the model still appears even if
    // the browser blocks fetch(), the file is opened from the wrong folder, or
    // Live Server serves from a different root.
    if (this.fallbackOBJText) {
      this.loadFromText(this.fallbackOBJText);
    } else {
      this.loadOBJ(objPath);
    }
  }

  loadFromText(text) {
    const data = this.parseOBJ(text);
    this.initBuffers(data.vertices, data.normals, data.uvs);
    this.loaded = true;
    this.error = null;
    console.log('OBJ loaded:', this.objPath, this.numVertices, 'vertices');
  }

  async loadOBJ(objPath) {
    try {
      const response = await fetch(objPath);
      if (!response.ok) {
        throw new Error('Could not fetch OBJ file: ' + objPath);
      }
      const text = await response.text();
      this.loadFromText(text);
    } catch (err) {
      console.error(err);
      this.error = err;
    }
  }

  parseOBJ(text) {
    const positions = [];
    const normals = [];
    const texcoords = [];
    const outPositions = [];
    const outNormals = [];
    const outUVs = [];

    function parseIndex(value, listLength) {
      const index = parseInt(value, 10);
      if (Number.isNaN(index)) return null;
      return index < 0 ? listLength + index : index - 1;
    }

    function subtract(a, b) {
      return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function cross(a, b) {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ];
    }

    function normalize(v) {
      const length = Math.hypot(v[0], v[1], v[2]);
      if (length < 0.00001) return [0, 1, 0];
      return [v[0] / length, v[1] / length, v[2] / length];
    }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0 || line.startsWith('#')) continue;

      const parts = line.split(/\s+/);
      const keyword = parts[0];

      if (keyword === 'v') {
        positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (keyword === 'vn') {
        normals.push(normalize([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]));
      } else if (keyword === 'vt') {
        texcoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
      } else if (keyword === 'f') {
        const face = [];
        for (let j = 1; j < parts.length; j++) {
          const token = parts[j];
          const fields = token.split('/');
          const vIndex = parseIndex(fields[0], positions.length);
          const tIndex = fields[1] ? parseIndex(fields[1], texcoords.length) : null;
          const nIndex = fields[2] ? parseIndex(fields[2], normals.length) : null;
          if (vIndex === null || !positions[vIndex]) continue;
          face.push({
            position: positions[vIndex],
            uv: tIndex !== null && texcoords[tIndex] ? texcoords[tIndex] : [0, 0],
            normal: nIndex !== null && normals[nIndex] ? normals[nIndex] : null
          });
        }

        for (let j = 1; j < face.length - 1; j++) {
          const tri = [face[0], face[j], face[j + 1]];
          let faceNormal = tri[0].normal;
          if (!faceNormal || !tri[1].normal || !tri[2].normal) {
            const edge1 = subtract(tri[1].position, tri[0].position);
            const edge2 = subtract(tri[2].position, tri[0].position);
            faceNormal = normalize(cross(edge1, edge2));
          }

          for (let k = 0; k < 3; k++) {
            outPositions.push(tri[k].position[0], tri[k].position[1], tri[k].position[2]);
            const n = tri[k].normal || faceNormal;
            outNormals.push(n[0], n[1], n[2]);
            outUVs.push(tri[k].uv[0], tri[k].uv[1]);
          }
        }
      }
    }

    this.normalizePositions(outPositions);
    return {
      vertices: new Float32Array(outPositions),
      normals: new Float32Array(outNormals),
      uvs: new Float32Array(outUVs)
    };
  }

  normalizePositions(vertices) {
    if (vertices.length < 3) return;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxX = Math.max(maxX, vertices[i]);
      maxY = Math.max(maxY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const scale = 2.0 / maxDim;

    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = (vertices[i] - centerX) * scale;
      vertices[i + 1] = (vertices[i + 1] - centerY) * scale;
      vertices[i + 2] = (vertices[i + 2] - centerZ) * scale;
    }
  }

  initBuffers(vertices, normals, uvs) {
    this.numVertices = vertices.length / 3;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    this.uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  }

  render() {
    if (!this.loaded) return;
    if (this.numVertices <= 0) return;

    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    setNormalMatrix(this.matrix);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform1f(u_texColorWeight, this.textureNum < 0 ? 0.0 : 1.0);
    gl.uniform1i(u_ForceColor, this.forceColor ? 1 : 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // OBJ files can have inconsistent triangle winding after conversion.
    // Draw the imported model without back-face culling so it is always visible.
    const cullWasEnabled = gl.isEnabled(gl.CULL_FACE);
    gl.disable(gl.CULL_FACE);
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    if (cullWasEnabled) {
      gl.enable(gl.CULL_FACE);
    }
  }
}
