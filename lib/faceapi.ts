import * as faceapi from "face-api.js";

export const FACE_MATCH_THRESHOLD = 0.5;
const MODEL_URL = "/models";

let modelsPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
	if (!modelsPromise) {
		modelsPromise = Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
			faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
			faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
		]).then(() => undefined);
	}
	return modelsPromise;
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: { facingMode: "user", width: 320, height: 240 },
		audio: false,
	});
	video.srcObject = stream;
	await video.play();
	return stream;
}

export function stopCamera(stream: MediaStream | null) {
	stream?.getTracks().forEach((t) => t.stop());
}

export async function captureFaceDescriptor(
	video: HTMLVideoElement,
): Promise<Float32Array | null> {
	const result = await faceapi
		.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
		.withFaceLandmarks()
		.withFaceDescriptor();
	return result?.descriptor ?? null;
}

/** Ambil beberapa sample descriptor berturut-turut lalu dirata-rata, untuk pendaftaran wajah yang lebih stabil. */
export async function captureAveragedDescriptor(
	video: HTMLVideoElement,
	samples = 5,
	intervalMs = 350,
): Promise<Float32Array | null> {
	const descriptors: Float32Array[] = [];
	for (let i = 0; i < samples; i++) {
		const d = await captureFaceDescriptor(video);
		if (d) descriptors.push(d);
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	if (!descriptors.length) return null;
	const len = descriptors[0].length;
	const avg = new Float32Array(len);
	for (const d of descriptors) {
		for (let i = 0; i < len; i++) avg[i] += d[i] / descriptors.length;
	}
	return avg;
}

export function descriptorDistance(
	stored: number[],
	captured: Float32Array,
): number {
	return faceapi.euclideanDistance(stored, Array.from(captured));
}
