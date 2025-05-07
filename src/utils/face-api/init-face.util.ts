import path from 'path'
// import '@tensorflow/tfjs-node'
import * as canvas from 'canvas'
import * as faceapi from 'face-api.js'

const { Canvas, Image, ImageData } = canvas

faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any)
const __dirname = path.resolve()

export async function initFaceAPI() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(__dirname, 'src/models'))
  await faceapi.nets.faceLandmark68Net.loadFromDisk(path.join(__dirname, 'src/models'))
  await faceapi.nets.faceRecognitionNet.loadFromDisk(path.join(__dirname, 'src/models'))
}
