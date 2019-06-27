/* eslint no-unused-vars: 0 */
/* eslint no-undef: 0 */

function showNewMailsNotification(address, reloadPage) {
	// We want the page to be reloaded. But then when clicking the notification, it can not find the tab and will open a new one.

	const notification = new Notification(address, {
		body: 'You have new messages',
		icon: '/images/logo.gif',
		tag: 'voidmail-replace-notification',
		renotify: true
	})
	notification.addEventListener('click', event => {
		// TODO: does not work after reloading the page, see #1
		event.preventDefault()
	})

	if (reloadPage) {
		location.reload()
	}
}

function enableNewMessageNotifications(address, reloadPage) {
	enableNotifications()
	const socket = io()
	socket.emit('sign in', address)

	socket.on('reconnect', () => {
		socket.emit('sign in', address)
	})
	socket.on('new emails', () => {
		showNewMailsNotification(address, reloadPage)
	})
}

function enableNotifications() {
	// Let's check if the browser supports notifications
	if (!('Notification' in window)) {
		return false
	}

	// Let's check whether notification permissions have already been granted
	if (Notification.permission === 'granted') {
		return true
	}

	// Otherwise, we need to ask the user for permission
	if (Notification.permission !== 'denied') {
		Notification.requestPermission(permission => {
			// If the user accepts, let's create a notification
			return permission === 'granted'
		})
	}

	// Finally, if the user has denied notifications and you
	// want to be respectful there is no need to bother them any more.
}
