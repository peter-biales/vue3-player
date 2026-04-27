<template>
	<div class="choice" :style="bodyLength">
		<header
			:style="
				getLinearGradient(
					files.playerBackground?.headerStart,
					files.playerBackground?.headerEnd,
				)
			"
		>
			<div
				class="album-pic"
				:style="{
					backgroundImage: 'url(' + getImgUrl(files.albumImg, 'album') + ')',
				}"
			></div>
			<div class="textBox">
				<span>Album</span>
				<span class="album-name">{{ files.albumName }}</span>
				<div class="short-info">
					<div
						class="artist-pic"
						:style="{
							backgroundImage: 'url(' + getImgUrl(files.artistImg, 'artist') + ')',
						}"
					></div>
					<span class="description">
						{{ files.interpret }} • {{ files.releaseDate.year }} • {{ songsCount }},
						{{ albumDuration }}
					</span>
				</div>
			</div>
		</header>
		<nav
			:style="
				getLinearGradient(
					files.playerBackground?.listStart,
					files.playerBackground?.listEnd,
				)
			"
		>
			<div class="main-bar">
				<button class="play" v-if="canplay && !playing" @click="playIt()"></button>
				<button class="pause" v-if="!canplay"></button>
				<button class="pause" v-if="canplay && playing" @click="pauseIt()"></button>
				<!-- <button class="share"></button> -->
				<button class="download" @click="downloadAlbum()">Stiahnúť</button>
			</div>
			<div class="tracklist">
				<div class="row title">
					<div class="group">
						<div class="order">#</div>
						<div class="name">Názov</div>
					</div>
					<div class="counter">Počet prehratí</div>
					<div class="duration"></div>
				</div>

				<div
					v-for="(value, key, index) in files.tracklist"
					class="row track"
					:class="{
						playing: key == currentSongPos && playing,
						paused: key == currentSongPos && !playing && canplay && currentTime != '',
					}"
					:key="index"
					@click.prevent="changeSong(key)"
				>
					<div class="group">
						<div
							class="order"
							v-if="key == currentSongPos && (playing || currentTime != '')"
						></div>
						<div class="order" v-else>{{ key + 1 }}</div>
						<div class="name">
							<div class="track-name">
								{{ value.name }}
							</div>
							<div class="artist-name">
								{{ files.interpret }}
							</div>
						</div>
					</div>
					<div class="counter">{{ value.prehratia }}</div>
					<div class="duration">
						{{ formatDuration(value.duration) }}
					</div>
				</div>
			</div>
			<div class="copyrights">
				<div class="release-date">
					{{ releaseDateText }}
				</div>
				<div class="copy">
					© {{ files.releaseDate.year }}
					{{ files.interpret }}
				</div>
				<br />
				<div class="copy" v-for="(copyright, key) in files.copyrights" :key="key">
					{{ copyright.title }}: {{ copyright.value }}
				</div>
			</div>
		</nav>
	</div>
	<main>
		<div id="player">
			<audio
				v-if="loaded"
				id="my-audio"
				@canplay="canplay = true"
				@timeupdate="coreUpdate()"
				:src="files.audioBaseUrl + files.tracklist[currentSongPos].audioUrl"
				type="audio/mpeg"
			>
				<a href="audiofile.mp3">audiofile.mp3</a>
			</audio>
			<div id="controls">
				<button :id="shuffleClass" @click="shuffleToogle()"></button>
				<button id="back" @click="songRouter('prev', 'btn')"></button>
				<button id="play" v-if="canplay && !playing" @click="playIt()"></button>
				<button id="pause" v-if="canplay && playing" @click="pauseIt()"></button>
				<button id="loading" v-if="!canplay"></button>
				<button id="next" @click="songRouter('next', 'btn')"></button>
				<button :id="repeatClass" @click="repeatModeRotation()"></button>
			</div>
			<div class="timeline">
				<div class="time-playing">{{ currentTime }}</div>
				<div id="progress" @click="setClickTime">
					<div id="bar"></div>
					<div id="position"></div>
				</div>
				<div class="time-duration">
					{{ duration }}
				</div>
			</div>
		</div>
	</main>
</template>

<script>
//import TheWelcome from '../components/TheWelcome.vue'
import albumService from '@/services/albumService'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default {
	name: 'AlbumView',
	components: {},
	data() {
		return {
			debuging: false, // debugging switch
			debugBuffers: [
				true, // MAIN
				true, // encryption()
			],
			// album metadata from endpoint
			files: {
				// predefined data for first hydration
				releaseDate: {
					year: null,
					month: null,
					day: null,
				},
				albumImg: '', // predefined album img filename
				artistImg: '', // predefined artist img filename
			},
			syncCoef: 0, // coeficient for encryption synchronization
			currentSongPos: 0, // index of current playing song
			canplay: false, // audio element is ready for play
			playing: false, // playing status
			loaded: false, // loaded metadata from endpoint
			currentTime: '', // playing time of current song
			duration: '', // duration of playing song
			playTimer: 0, // timer for delayed play
			repeat: 'off', // option for repeat button
			shuffle: false, // option for shuffle button
			resized: 0, // variable for recalculate height of body
			shuffleBuffer: [], // buffer for flags of played songs in shuffle mode
			timetracking: {
				SongPos: 0, // song index for tracking
				trackCount: 0, // store played time when pause song
				timeStarted: 0, // when started playing
				sended: false, // counted song playback
			},
		}
	},
	methods: {
		// resize reactivity for compute choice height on phones
		handleResize() {
			this.resized++
		},
		// download all songs in zip file
		downloadAlbum() {
			let url = this.files.audioBaseUrl + this.files.downloadAlbum
			document.location.href = url
		},
		// delayed plaing song
		delayedPlay() {
			clearTimeout(this.playTimer)
			this.playTimer = setTimeout(() => {
				this.playIt()
			}, 600)
		},
		// manage player to change song
		changeSong(newSongPos) {
			let otherSong = this.currentSongPos != newSongPos

			if (this.playing) {
				this.pauseIt()
			}
			this.currentSongPos = newSongPos
			document.getElementById('bar').style.width = '0%'
			if (otherSong) {
				this.delayedPlay()
			} else {
				this.playIt()
			}
		},
		// format duration array to string xx:xx or xx:xx:xx
		formatDuration(durationArray) {
			let returnString = ''
			durationArray.forEach((item, index) => {
				// show when index = 0 and value > 0
				// show when index > 0
				if (item > 0 || index != 0) {
					// digit padding: 01:02
					if (item > 9) {
						returnString += item + ' : '
					} else {
						returnString += '0' + item + ' : '
					}
				}
			})
			returnString = returnString.slice(0, -2)
			return returnString
		},
		// formatting time in player control panel
		formatTime(secTime) {
			if (isNaN(secTime)) {
				return '-- / --'
			}

			let minutes = parseInt(parseInt(secTime) / 60)
			let seconds = parseInt(secTime) % 60

			if (minutes < 1) {
				minutes = '00'
			} else if (minutes < 10) {
				minutes = '0' + minutes
			}

			if (seconds < 1) {
				seconds = '00'
			} else if (seconds < 10) {
				seconds = '0' + seconds
			}
			return minutes + ':' + seconds
		},
		// save succesfull playback to server
		savePlayback() {
			let songId = this.files.tracklist[this.currentSongPos].id
			let hash = this.encryption(songId)
			albumService
				.setSongCount(hash)
				.then((data) => {
					if (data == '-') {
						this.savePlayback()
					} else {
						this.files.tracklist[this.currentSongPos].prehratia = data
					}
				})
				.catch((error) => {
					console.error('Error:', error)
				})
		},
		// customized & colored console.log()
		consolePaint(arg, debugBuffer = 0) {
			if (this.debuging && this.debugBuffers[debugBuffer]) {
				console.log(
					'%c' + arg,
					'background: black; color: #bada55; padding: 2px 8px; border-radius: 8px; font-weight: 700',
				)
			}
		},
		// customized console.log()
		consoleLog(arg, debugBuffer = 0) {
			if (this.debuging && this.debugBuffers[debugBuffer]) {
				console.log(arg)
			}
		},
		// tracking logic for save playback to server
		trackPlayback(arg) {
			let timeNow = parseInt(Date.now() / 1000)
			let playTime = this.timetracking.trackCount + timeNow - this.timetracking.timeStarted

			if (arg == 'checkState') {
				let minPlayPercentage = 60
				let audioDuration = document.getElementById('my-audio').duration
				let minPlayTime = (parseInt(audioDuration) / 100) * minPlayPercentage

				if (minPlayTime < playTime && !this.timetracking.sended) {
					this.timetracking.sended = true
					this.consolePaint('savePlayback()', 1)
					this.savePlayback()
				}
			}
			if (arg == 'play') {
				// current played song changed
				if (this.timetracking.SongPos != this.currentSongPos) {
					// reset play time counter
					this.timetracking.trackCount = 0
					// reset sending success play to server
					this.timetracking.sended = false
					// set actual song index
					this.timetracking.SongPos = this.currentSongPos
				}
				// reset start time for tracking
				this.timetracking.timeStarted = timeNow
			}
			if (arg == 'pause') {
				// save played time
				this.timetracking.trackCount = playTime
				// reset start time for tracking
				this.timetracking.timeStarted = timeNow
			}
		},
		// update essentials variables
		coreUpdate() {
			// set currentTime and duration actual song for render
			let audioCurrentTime = document.getElementById('my-audio').currentTime
			let audioDuration = document.getElementById('my-audio').duration
			this.currentTime = this.formatTime(audioCurrentTime)
			this.duration = this.formatTime(audioDuration)

			// compute & set seekbar width
			let seekBarElement = document.getElementById('bar')
			let seekBarWidth = Math.floor((audioCurrentTime / audioDuration) * 100)
			seekBarElement.style.width = seekBarWidth + '%'

			// check song tracking
			this.trackPlayback('checkState')

			// route to next song in the end song
			if (audioCurrentTime == audioDuration) {
				this.songRouter('next', 'core')
			}
		},
		// actions after last played song
		onPlaybackFinished() {
			this.pauseIt()
			this.currentSongPos = 0
			document.getElementById('bar').style.width = '0px'
			this.duration = ''
			this.currentTime = ''
		},
		// route next song with shuffle
		shuffleRoute() {
			let nextPos = this.shuffleNext()
			if (nextPos != -1) {
				this.shuffleBuffer[nextPos] = false
				this.changeSong(nextPos)
			} else {
				if (this.repeat != 'off') {
					for (let i = 0; i < this.shuffleBuffer.length; i++) {
						this.shuffleBuffer[i] = true
					}
					nextPos = this.shuffleNext()
					this.shuffleBuffer[nextPos] = false
					this.changeSong(nextPos)
				} else {
					this.onPlaybackFinished()
				}
			}
		},
		// route next song without shuffle
		basicRoute() {
			if (this.currentSongPos == this.files.tracklist.length - 1) {
				if (this.repeat == 'all') {
					this.changeSong(0)
				} else {
					this.onPlaybackFinished()
				}
			} else {
				this.changeSong(this.currentSongPos + 1)
			}
		},
		// rules for next / previous song play
		songRouter(action, source) {
			// click to btn -> next
			if (action == 'next' && source == 'btn') {
				// shuffle = on
				if (this.shuffle) {
					this.shuffleRoute()
				}
				// shuffle = off
				else {
					this.basicRoute()
				}
			}

			// route in core -> next
			if (action == 'next' && source == 'core') {
				// repeat = off / all
				if (this.repeat == 'off' || this.repeat == 'all') {
					// shuffle = on
					if (this.shuffle) {
						this.shuffleRoute()
					}
					// shuffle = off
					else {
						this.basicRoute()
					}
				}
				// repeat = one
				else if (this.repeat == 'one') {
					this.changeSong(this.currentSongPos)
					document.getElementById('my-audio').currentTime = 0
					this.playIt()
				}
			}

			// click on btn -> previous
			if (action == 'prev' && source == 'btn') {
				// current time > 5s
				if (document.getElementById('my-audio').currentTime > 5) {
					document.getElementById('my-audio').currentTime = 0
				}
				// current time < 6s
				else {
					// shuffle = off
					if (!this.shuffle) {
						// song index = 0 && repeat = all
						if (this.currentSongPos == 0 && this.repeat == 'all') {
							this.changeSong(this.files.tracklist.length - 1)
						}
						// song index = 0 && repeat = off / one
						else if (this.currentSongPos == 0) {
							document.getElementById('my-audio').currentTime = 0
						}
						// song index != 0 && repeat = all / one / off
						else {
							this.changeSong(this.currentSongPos - 1)
						}
					}
				}
			}
		},
		// set playing song properly
		playIt() {
			document.getElementById('my-audio').play()
			this.playing = true
			this.trackPlayback('play')
		},
		// pause song properly
		pauseIt() {
			document.getElementById('my-audio').pause()
			this.playing = false
			this.trackPlayback('pause')
		},
		// set repeat mode by clicking on button
		repeatModeRotation() {
			if (this.repeat == 'off') {
				this.repeat = 'all'
			} else if (this.repeat == 'one') {
				this.repeat = 'off'
			} else if (this.repeat == 'all') {
				this.repeat = 'one'
			}
		},
		// switch shuffle toogle and prepare shuffle mask data
		shuffleToogle() {
			if (this.shuffle) {
				this.shuffleBuffer = []
			} else {
				for (let i = 0; i < this.files.tracklist.length; i++) {
					this.shuffleBuffer.push(true)
				}
				this.shuffleBuffer[this.currentSongPos] = false
			}
			this.shuffle = !this.shuffle
		},
		// choose random non played song to play
		shuffleNext() {
			let nonPlayedSongs = []
			// add indexes of non played songs
			for (let i = 0; i < this.shuffleBuffer.length; i++) {
				if (this.shuffleBuffer[i]) {
					nonPlayedSongs.push(i)
				}
			}
			// random choose from non played or -1
			if (nonPlayedSongs.length == 0) {
				return -1
			} else {
				return nonPlayedSongs[parseInt(Math.random() * 100, 10) % nonPlayedSongs.length]
			}
		},
		// set current play time from seekBar
		setClickTime(event) {
			// calculate the normalized position clicked
			var clickPosition =
				(event.pageX - document.getElementById('progress').offsetLeft) /
				document.getElementById('progress').offsetWidth
			var clickTime = clickPosition * document.getElementById('my-audio').duration

			// move the playhead to the correct position
			document.getElementById('my-audio').currentTime = clickTime
		},
		// encrypt song number to hash
		encryption(songNumber) {
			let codeTable = ['b', 'd', 'p', 'h', 'a', 'l', 'm', 'o', 't', 's']
			let maskTables = [
				[
					false,
					true,
					true,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
				],
				[
					false,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					true,
					true,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
					false,
					false,
				],
				[
					true,
					true,
					false,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					false,
					true,
					true,
					false,
					true,
					true,
					false,
					true,
					false,
				],
				[
					false,
					false,
					true,
					true,
					false,
					true,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					true,
					true,
					true,
					false,
					false,
				],
				[
					false,
					false,
					true,
					false,
					true,
					false,
					true,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
				],
				[
					false,
					false,
					false,
					true,
					true,
					true,
					false,
					true,
					true,
					false,
					true,
					false,
					true,
					true,
					false,
					true,
					true,
					false,
					false,
					false,
				],
				[
					false,
					false,
					true,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					false,
					true,
					false,
				],
				[
					false,
					true,
					true,
					true,
					true,
					true,
					false,
					true,
					false,
					false,
					true,
					false,
					false,
					true,
					false,
					true,
					false,
					true,
					false,
					false,
				],
				[
					true,
					false,
					false,
					true,
					true,
					false,
					true,
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
				],
				[
					true,
					false,
					false,
					true,
					true,
					false,
					false,
					false,
					true,
					false,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
					true,
					true,
				],
				[
					false,
					false,
					false,
					false,
					false,
					true,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
					true,
					true,
					false,
					true,
					true,
					false,
				],
				[
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					true,
					true,
					false,
					true,
					false,
					false,
					true,
				],
				[
					false,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					false,
					true,
					true,
					true,
					false,
					false,
					false,
					true,
				],
				[
					true,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					false,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
					false,
					true,
				],
				[
					true,
					false,
					true,
					false,
					true,
					true,
					true,
					false,
					false,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					true,
					false,
				],
				[
					false,
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
					true,
					true,
					false,
					true,
				],
				[
					false,
					true,
					false,
					true,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
					true,
					false,
					true,
					false,
					false,
					false,
					true,
					true,
				],
				[
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					true,
				],
				[
					false,
					true,
					true,
					false,
					true,
					false,
					true,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
				],
				[
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
					false,
					true,
					true,
					true,
					false,
					false,
					true,
					false,
				],
				[
					false,
					false,
					true,
					false,
					false,
					false,
					true,
					false,
					true,
					true,
					true,
					false,
					true,
					false,
					true,
					false,
					true,
					false,
					true,
					true,
				],
				[
					false,
					false,
					true,
					true,
					true,
					true,
					false,
					true,
					true,
					true,
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					false,
					true,
					false,
				],
				[
					true,
					true,
					false,
					true,
					true,
					false,
					false,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					false,
					true,
					false,
					false,
					true,
				],
				[
					false,
					true,
					true,
					true,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					false,
					false,
					false,
					true,
					true,
					false,
					true,
				],
				[
					false,
					true,
					false,
					true,
					false,
					true,
					false,
					false,
					true,
					true,
					false,
					false,
					true,
					false,
					true,
					true,
					true,
					false,
					true,
					false,
				],
				[
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					false,
					false,
					true,
					true,
					false,
					true,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
				],
				[
					false,
					true,
					true,
					false,
					false,
					false,
					false,
					true,
					false,
					true,
					false,
					true,
					true,
					false,
					true,
					true,
					true,
					false,
					false,
					true,
				],
				[
					true,
					true,
					true,
					true,
					false,
					true,
					false,
					false,
					false,
					false,
					false,
					false,
					false,
					true,
					false,
					false,
					true,
					true,
					true,
					true,
				],
				[
					true,
					false,
					true,
					true,
					true,
					true,
					false,
					false,
					false,
					true,
					false,
					false,
					false,
					false,
					false,
					false,
					true,
					true,
					true,
					true,
				],
				[
					false,
					false,
					false,
					true,
					false,
					true,
					true,
					true,
					true,
					true,
					false,
					true,
					false,
					false,
					false,
					true,
					false,
					true,
					true,
					false,
				],
				[
					false,
					false,
					false,
					true,
					true,
					false,
					true,
					false,
					false,
					true,
					false,
					true,
					false,
					true,
					true,
					true,
					false,
					true,
					true,
					false,
				],
			]

			// get actual time synced with servertime
			let timeNow = parseInt(Date.now() / 1000) + this.syncCoef
			this.consoleLog('timeNow: ' + timeNow, 1)

			// parse number from num
			let parseNumber = (num) => Number(num)

			// create array from actual timestamp
			let timeArray = Array.from(String(timeNow), parseNumber)
			this.consoleLog('timeArray: ' + timeArray, 1)

			// convert timeArray to array of chars from codeTable
			let timeCoded = []
			timeArray.forEach(function (item) {
				timeCoded.push(codeTable[parseInt(item)])
			})
			this.consoleLog('timeCoded: ' + timeCoded, 1)

			// get structured date
			let actualTime = new Date()
			actualTime.setTime(timeNow * 1000) // javascript timestamps are in milliseconds

			// select day form month & from week
			let dayFromMonth = actualTime.getDate() - 1
			this.consoleLog('dayFromMonth: ' + dayFromMonth, 1)
			let dayFromWeek = actualTime.getDay() - 1
			this.consoleLog('dayFromWeek: ' + dayFromWeek, 1)

			let hash = ''
			let surTrue = 0
			let surFalse = 0

			// get random integer between min - max
			function getRndInteger(min, max) {
				return Math.floor(Math.random() * (max - min)) + min
			}
			this.consoleLog('maskTables[dayFromMonth]: ' + maskTables[dayFromMonth].toString(), 1)

			const vm = this
			// create hash from track index and hash tables
			maskTables[dayFromMonth].forEach(function (maskRow) {
				// true in maskTable => add to hash verify char
				if (maskRow) {
					vm.consoleLog('surTrue: ' + surTrue, 1)
					vm.consoleLog('timeCoded[surTrue]: ' + timeCoded[surTrue], 1)

					hash = hash + timeCoded[surTrue]
					surTrue++
				}
				// false in maskTable => add to hash random char or char-coded song index
				else {
					let charCode = getRndInteger(97, 122) // generate charCode from a - z

					vm.consoleLog('surFalse: ' + surFalse, 1)
					vm.consoleLog('charCode: ' + charCode, 1)

					// if count of false in maskRow == day from week => add to hash char-coded song index
					if (surFalse == dayFromWeek) {
						vm.consoleLog('surFalse == dayFromWeek', 1)
						vm.consoleLog(
							'String.fromCharCode(97 + songNumber): ' +
								String.fromCharCode(97 + songNumber),
							1,
						)
						hash = hash + String.fromCharCode(97 + songNumber)
					}
					// else add to hash random char from charCode
					else {
						vm.consoleLog(
							'String.fromCharCode(charCode): ' + String.fromCharCode(charCode),
							1,
						)

						hash = hash + String.fromCharCode(charCode)
					}
					surFalse++
				}
			})

			this.consoleLog('hash: ' + hash, 1)
			return hash
		},
		// return url for img resources from backend
		getImgUrl(filename, type) {
			if (type == 'album') {
				return API_BASE_URL + '/album/' + filename
			} else if (type == 'artist') {
				return API_BASE_URL + '/artist/' + filename
			} else {
				return ''
			}
		},
		// gradient style for header or track list
		getLinearGradient(startColor, endColor) {
			return {
				background: 'linear-gradient(180deg, ' + startColor + ' 0%, ' + endColor + ' 100%)',
			}
		},
	},
	created() {
		this.consoleLog('this.$options:', 0)
		this.consoleLog(this.$options, 0)

		// fetch album metadata
		albumService
			.getAlbumData()
			.then((data) => {
				this.loaded = true
				this.files = data
				document.title = this.files.albumName
			})
			.then(() => {
				// add played attribute to track data
				this.files.tracklist.forEach(function (track) {
					track.played = false
				})
				// fetch play counts of songs
				albumService.getAlbumTrackPlayCountList().then((data) => {
					// pairing data
					this.files.tracklist.forEach(function (track, index) {
						track.prehratia = data[index].prehratia
					})
				})
			})

		// get server time & calc coeficient for synchronization with local time
		albumService.getServerTime().then((data) => {
			this.consoleLog('server time: ' + data, 0)
			this.syncCoef = parseInt(data) - parseInt(Date.now() / 1000)
		})
	},
	mounted() {
		window.addEventListener('resize', this.handleResize)
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.handleResize)
	},
	computed: {
		// return current song object
		currentSong() {
			return this.files.tracklist[this.currentSongPos]
		},
		// return length of html body view without bottom control panel
		bodyLength() {
			return {
				height:
					window.innerHeight -
					92 + // 92 is height of bottom control panel
					this.resized -
					this.resized +
					'px',
			}
		},
		// return class for repeat button
		repeatClass() {
			if (this.repeat == 'off') {
				return 'repeat'
			} else if (this.repeat == 'one') {
				return 'repeat-1'
			} else if (this.repeat == 'all') {
				return 'repeat-all'
			}
			return ''
		},
		// return class for shuffle button
		shuffleClass() {
			if (this.shuffle) {
				return 'shuffle-on'
			} else {
				return 'shuffle'
			}
		},
		// return tracklist length in text like 10 skladieb, 2 skladby
		songsCount() {
			let tracklistLength = this.files.tracklist?.length
			let naming = ['skladieb', 'skladba', 'skladby', 'skladby', 'skladby']
			if (tracklistLength < 5) {
				return tracklistLength + ' ' + naming[tracklistLength]
			} else {
				return tracklistLength + ' ' + naming[0]
			}
		},
		// prepare for compute album duration
		albumDuration() {
			let durationArray = [0, 0, 0] // hour, min, sec
			let durationText = ''

			// sum hours, mins, seconds itself
			this.files.tracklist?.forEach((item) => {
				durationArray.forEach((dur, index) => {
					durationArray[index] += item.duration[index]
				})
			})

			// Normalize time values
			for (let i = 2; i > 0; i--) {
				if (durationArray[i] > 59) {
					durationArray[i - 1] += parseInt(durationArray[i] / 60)
					durationArray[i] = durationArray[i] % 60
				}
			}

			// format array values to duration text
			let timeLabels = [' hod ', ' min ', 's']
			durationArray.forEach((item, index) => {
				if (item > 0) {
					durationText += item + timeLabels[index]
				}
			})
			durationText.trim()

			return durationText
		},
		// release date text in copyright section
		releaseDateText() {
			const rDat = this.files.releaseDate

			const formattedDate = new Date(rDat.year, rDat.month - 1, rDat.day).toLocaleDateString(
				'sk-SK',
				{
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				},
			)

			return formattedDate
		},
	},
}
</script>

<style scoped></style>
