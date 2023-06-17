import { ref, shallowRef, watch } from 'vue-demi'
import type { Ref, ShallowRef } from 'vue-demi'
import { inBrowser, isChrome } from './utils'

declare global {
	interface Window {
		graceRecognitionReady: boolean
		SpeechRecognition: SpeechRecognition
		webkitSpeechRecognition: SpeechRecognition
	}
}

export type RecognitionEventType =
	| 'start'
	| 'audiostart'
	| 'soundstart'
	| 'speechstart'
	| 'result'
	| 'speechend'
	| 'soundend'
	| 'audioend'
	| 'end'
	| 'error'
	| 'nomatch'

export interface RecognitionOptions {
	preferTouchEvent: boolean
	lang: 'zh-CN' | string
	interimResults: boolean
	maxAlternatives: number
	continuous: boolean
	onStatusChange?: (
		status: RecognitionEventType,
		event: Event | SpeechRecognitionEvent | SpeechRecognitionErrorEvent
	) => void
}

let ready: Ref<boolean>,
	status: Ref<RecognitionEventType>,
	result: Ref<string>,
	recognition: SpeechRecognition
const defaultOptions: RecognitionOptions = {
	preferTouchEvent: false,
	lang: 'zh-CN',
	interimResults: false,
	maxAlternatives: 1,
	continuous: false
}

function useRecognition(options: RecognitionOptions) {
	if (!inBrowser) return
	if (typeof window.SpeechRecognition !== 'undefined') {
		recognition = new SpeechRecognition()
	} else if (typeof window.webkitSpeechRecognition !== 'undefined') {
		// eslint-disable-next-line new-cap
		recognition = new webkitSpeechRecognition()
	} else {
		console.error('SpeechRecognition is not supported')
		return
	}

	options = Object.assign(defaultOptions, options || {})
	recognition.lang = options.lang
	recognition.interimResults = options.interimResults
	recognition.maxAlternatives = options.maxAlternatives
	recognition.continuous = options.continuous

	bindHandler()

	if (!ready) {
		ready = ref(!isChrome)

		// exec
		// watch([ready, voice, effects], ([isReady, voiceValue, effectsValue]) => {
		// 	if (isReady && voiceValue && effectsValue.length > 0) {
		// 		for (const { content, utterOptions } of effectsValue) {
		// 			utter.value = new SpeechSynthesisUtterance(content)
		// 			let action: keyof UtterOptions
		// 			for (action in utterOptions) {
		// 				utter.value[action] = utterOptions[action] as never
		// 			}
		// 			utter.value.voice = voiceValue
		// 			utter.value.pitch = options.pitch
		// 			utter.value.rate = options.rate
		// 			utter.value.volume = options.volume
		// 			speech.speak(utter.value)
		// 		}
		// 		effects.value = []
		// 		utter.value = null
		// 	}
		// })
	}
	if (!ready.value) {
		const eventName = options.preferTouchEvent ? 'touchend' : 'click'
		// init
		const handler = (
			event:
				| MouseEvent
				| TouchEvent
				| CompositionEvent
				| FocusEvent
				| InputEvent
				| KeyboardEvent
		) => {
			ready.value = window.graceRecognitionReady = event.isTrusted
			if (ready.value) {
				window.removeEventListener(eventName, handler)
				window.removeEventListener('keypress', handler)
			}
		}
		window.addEventListener(eventName, handler)
		window.addEventListener('keypress', handler)
	}

	/**
	 * bind handler
	 */
	function bindHandler() {
		recognition.onresult = (event: SpeechRecognitionEvent) => {
			status.value = event.type as RecognitionEventType
			result.value = ([] as any)
				.concat(event.results)
				.map((item: SpeechRecognitionResult) => item[0].transcript)
				.join('|') // event.results[0][0].transcript;
			options.onStatusChange && options.onStatusChange('result', event)
		}
		recognition.onspeechend = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('speechend', event)
		}
		recognition.onnomatch = (event: SpeechRecognitionEvent) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('nomatch', event)
		}
		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('error', event)
		}
		recognition.onaudioend = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('audioend', event)
		}
		recognition.onaudiostart = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('audiostart', event)
		}
		recognition.onend = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('end', event)
		}
		recognition.onsoundend = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('soundend', event)
		}
		recognition.onsoundstart = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('soundstart', event)
		}
		recognition.onspeechstart = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('speechstart', event)
		}
		recognition.onstart = (event: Event) => {
			status.value = event.type as RecognitionEventType
			options.onStatusChange && options.onStatusChange('start', event)
		}
	}

	/**
	 * Starts the speech recognition service listening to incoming audio with intent to recognize grammars associated with the current SpeechRecognition.
	 */
	function start() {
		recognition.start()
	}

	/**
	 * Stops the speech recognition service from listening to incoming audio, and doesn't attempt to return a SpeechRecognitionResult.
	 */
	function abort() {
		recognition.abort()
	}

	/**
	 * Stops the speech recognition service from listening to incoming audio, and attempts to return a SpeechRecognitionResult using the audio captured so far.
	 */
	function stop() {
		recognition.stop()
	}

	return {
		ready,
		recognition,
		start,
		abort,
		stop
	}
}

export default useRecognition
