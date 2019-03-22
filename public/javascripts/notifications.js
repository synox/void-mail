function enableNewMessageNotifications(address, reloadPage) {
  enableNotifications()
  const socket = io()
  socket.emit('sign in', address)

  socket.on('reconnect', () => {
    socket.emit('sign in', address)
  })
  socket.on('new emails', () => {
    const notif = new Notification(
      address, {
        body: 'You have new messages',
        icon: '/images/logo.gif'
      })
    notif.addEventListener('click', event => {
      window.focus()
      notif.close()
    })

    if (reloadPage) {
      location.reload()
    }
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
      return permission === 'granted';
    })
  }

  // Finally, if the user has denied notifications and you
  // want to be respectful there is no need to bother them any more.
}
