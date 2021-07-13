export default {
    // remove user video when disconnected and adjust the screen accordingly  
    closeVideo(elemId) {
        if (document.getElementById(elemId)) {
            document.getElementById(elemId).remove();
            // this.adjustVideoElemSize();
        }
    },


    // if the main area is in focus, that is the chat window is not open
    pageHasFocus() {
        if (document.onfocusout || window.onblur || document.hidden || window.onpagehide) {
            return false;
        }
        return true;
    },


    // Sharing Screen
    shareScreen() {
        if (!this.isMediaAvailable()) {
            throw new Error('User media not available');

        } else {
            return navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
        }
    },



    // function to get query string for the given url and returnKey after decoding uri components
    getQueryString(url = '', returnKey = '') {
        if (!url) {
            url = location.href;
        }
        let query = decodeURIComponent(url).split('#', 2)[0].split('?', 2)[1];
        if (query) {
            let splitString = query.split('&');
            if (splitString.length > 0) {
                let queryObj = {};

                splitString.forEach(function(keyValPair) {
                    let keyVal = keyValPair.split('=', 2);
                    if (keyVal.length > 0) {
                        queryObj[keyVal[0]] = keyVal[1];
                    }
                });
                if (returnKey) {
                    if (queryObj[returnKey]) {
                        return queryObj[returnKey];
                    } else {
                        return null;
                    }
                } else {
                    return queryObj;
                }
            }
            return null;
        }
        return null;
    },


    // getting the audio from the user
    getUserAudio() {
        if (!this.isMediaAvailable()) {
            throw new Error('User media not available');
        } else {
            return navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
        }
    },

    // checking if media is availaible across multiple platforms
    isMediaAvailable() {
        var mediaSrc1 = Boolean(navigator.getUserMedia);
        var mediaSrc2 = Boolean(navigator.webkitGetUserMedia);
        var mediaSrc3 = Boolean(navigator.mozGetUserMedia);
        var mediaSrc4 = Boolean(navigator.msGetUserMedia);
        return (mediaSrc1 || mediaSrc2 || mediaSrc3 || mediaSrc4);
    },


    // connecting with ICE Servers 
    getIceServer() {
        return {
            iceServers: [{
                    urls: ["stun:eu-turn4.xirsys.com"]
                },
                {
                    username: "ml0jh0qMKZKd9P_9C0UIBY2G0nSQMCFBUXGlk6IXDJf8G2uiCymg9WwbEJTMwVeiAAAAAF2__hNSaW5vbGVl",
                    credential: "4dd454a6-feee-11e9-b185-6adcafebbb45",
                    urls: [
                        "turn:eu-turn4.xirsys.com:80?transport=udp",
                        "turn:eu-turn4.xirsys.com:3478?transport=tcp"
                    ]
                }
            ]
        };
    },


    // function to add the marker for new messages
    toggleChatNotificationBadge() {
        if (!document.querySelector('#chat-pane').classList.contains('chat-opened')) {
            document.querySelector('#new-chat-notification').removeAttribute('hidden');
        } else {
            document.querySelector('#new-chat-notification').setAttribute('hidden', true);
        }
    },

    // adding chat messages in the chat area
    addChat(data, senderType) {
        let chatMsgDiv = document.querySelector('#chat-messages');
        let newMsg = document.createElement('div');
        newMsg.className = 'flex items-center';
        let msgText = document.createElement('p');
        msgText.className = "self-end relative mb-3 text-center px-2.5 py-2 rounded-xl";
        msgText.innerText = data.msg;
        let senderImg = document.createElement('img');
        senderImg.src = data.photo;
        senderImg.className = "rounded-full w-8 mx-1 my-1";
        if (senderType !== 'remote') {
            newMsg.className += ' flex-row-reverse';
            msgText.className += ' text-white bg-gray-600';
        } else {
            this.toggleChatNotificationBadge();
            msgText.className += ' text-black bg-gray-100';
        }
        newMsg.appendChild(senderImg);
        newMsg.appendChild(msgText);
        chatMsgDiv.appendChild(newMsg);
        const elem = document.getElementById("bottom");
        if (this.pageHasFocus) {
            elem.scrollIntoView({
                behavior: "smooth"
            });
        }
    },

    // function to change media tracks
    replaceTrack(stream, recipientPeer) {
        let sender;
        if (recipientPeer.getSenders) {
            sender = recipientPeer.getSenders().find(s => s.track && s.track.kind === stream.kind);
            sender.replaceTrack(stream);
        } else {
            sender = false;
        }
    },


    // toggling between the icons while screen sharing
    toggleShareIcons(share) {
        let shareIconElem = document.querySelector('#share-screen');
        if (!share) {
            shareIconElem.setAttribute('title', 'Share screen');
            shareIconElem.children[0].classList.add('text-white');
            shareIconElem.children[0].classList.remove('text-primary');
        } else {
            shareIconElem.setAttribute('title', 'Stop sharing screen');
            shareIconElem.children[0].classList.add('text-primary');
            shareIconElem.children[0].classList.remove('text-white');
        }
    },






    // edit the icon on the other people's stream if you mute them 
    muteButtonOthers(e) {
        if (!e.target.classList.contains('fa-microphone')) {
            e.target.parentElement.previousElementSibling.muted = false;
            e.target.classList.add('fa-microphone');
            e.target.classList.remove('fa-microphone-slash');
        } else {
            e.target.parentElement.previousElementSibling.muted = true;
            e.target.classList.add('fa-microphone-slash');
            e.target.classList.remove('fa-microphone');
        }
    },

    // zoom other people's stream
    maximiseStreamOthers(e) {
        let elem = e.target.parentElement.previousElementSibling;
        elem.requestFullscreen();
    },

    // function to download the recorded stream
    downloadStream(stream, user) {
        let blob = new Blob(stream, {
            type: 'video/mp4'
        });
        let file = new File([blob], `${user}-${moment().unix()}-record.mp4`);
        saveAs(file);
    },





    // function to add self video
    setStream(stream, mirrorMode = true) {
        const localVideoElement = document.getElementById('local');
        localVideoElement.srcObject = stream;
        if (mirrorMode) {
            localVideoElement.classList.add('mirror-mode');
        } else {
            localVideoElement.classList.remove('mirror-mode');
        }
    },



    // helper function for recording
    toggleModal(id, show) {
        let element = document.getElementById(id);
        if (!show) {
            element.style.display = 'none';
            element.setAttribute('aria-hidden', true);
        } else {
            element.style.display = 'block';
            element.removeAttribute('aria-hidden');
        }
    },


    // getting user media
    getUserFullMedia() {
        if (!this.isMediaAvailable()) {
            throw new Error('User media not available');

        } else {
            return navigator.mediaDevices.getUserMedia({
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
        }
    },
};