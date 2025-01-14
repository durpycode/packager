import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import fetch from 'cross-fetch';
import {name} from '../../../package.json';
import icon from '../images/default-icon.png';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const safeJoin = (root, file) => {
  root = path.join(root, '/');
  const joined = path.join(root, file);
  if (joined.startsWith(root)) {
    return joined;
  }
  return null;
};

const cacheDirectory = path.join(__dirname, '..', '.packager-cache');
const getCachePath = async (asset) => {
  if (!asset.sha256) return null;
  const path = safeJoin(cacheDirectory, asset.sha256);
  if (path) {
    await mkdir(cacheDirectory, {
      recursive: true
    });
    return path;
  }
  return null;
};

const nodeBufferToArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const arrayBufferToNodeBuffer = (buffer) => Buffer.from(buffer);

class NodeAdapter {
  async getCachedAsset (asset) {
    if (asset.src.startsWith('scaffolding/')) {
      const file = safeJoin(__dirname, asset.src);
      if (file) {
        return readFile(file, 'utf-8');
      }
    }

    if (asset.src.startsWith('https:')) {
      const cachePath = await getCachePath(asset);
      if (cachePath) {
        try {
          return nodeBufferToArrayBuffer(await readFile(cachePath));
        } catch (e) {
          // ignore
        }
      }
      console.log(`[${name}]: downloading large asset ${asset.src}; this may take a while`);
      const res = await fetch(asset.src);
      if (!res.ok) {
        throw new Error(`Unexpected status code: ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      if (cachePath) {
        await writeFile(cachePath, arrayBufferToNodeBuffer(arrayBuffer));
      }
      return arrayBuffer;
    }
  }

  async cacheAsset (asset, result) {
    // all of our caching logic lives in getCachedAsset
  }

  async getAppIcon (file) {
    // TODO
    const buffer = await readFile(path.join(__dirname, icon));
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  readAsURL (file) {
    // TODO
    throw new Error('image features not implemented in Node.js module');
  }
}

export default NodeAdapter;
