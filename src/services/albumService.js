const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const fetchData = (url) => {
	return fetch(url).then((response) => response.json())
}
const fetchText = (url) => {
	return fetch(url).then((response) => response.text())
}

export default {
	getAlbumData() {
		return fetchData(`${API_BASE_URL}/album.json`)
	},
	getAlbumTrackPlayCountList() {
		return fetchData(`${API_BASE_URL}/getAlbum.php`)
	},
	getServerTime() {
		return fetchData(`${API_BASE_URL}/getTime.php`)
	},
	setSongCount(hash) {
		return fetchText(`${API_BASE_URL}/setSong.php?hash=${hash}`)
	},
}
