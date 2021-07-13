import help from './helpers.js';

window.addEventListener('load', () => {
    // checking if the user is logged in or not, if not redirecting to the sign in page
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // getting the current room and username
            const room = help.getQueryString(location.href, 'room');
            const username = user.displayName;

            var participants = [];

            let socket = io('/stream');
            var mirrorMode = false;

            // enabling video tool bar buttons
            let commElem = document.getElementsByClassName('room-comm');
            let iter = 0;
            while (iter < commElem.length) {
                commElem[iter].attributes.removeNamedItem('hidden');
                iter++;
            }

            var mediaRecorder = '';
            var screen = '';
            var recordedStream = [];
            var socketId = '';
            var myStream = '';


            //Get user video by default
            getAndSetUserStream();


            socket.on('connect', () => {
                // set socketId
                socketId = socket.io.engine.id;

                // new user joins
                socket.on('new user', (data) => {
                    socket.emit('newUserStart', {
                        to: data.socketId,
                        sender: socketId
                    });
                    participants.push(data.socketId);
                    initialize(true, data.socketId);
                });



                // joining a room
                socket.emit('subscribe', {
                    room: room,
                    socketId: socketId
                });

                // entering the details of the new user
                socket.on('newUserStart', (data) => {
                    participants.push(data.sender);
                    initialize(false, data.sender);
                });

                // when user chats
                socket.on('chat', (data) => {
                    help.addChat(data, 'remote');
                });

                // getting details of communicating candidates
                socket.on('ice candidates', async(data) => {
                    if (data.candidate) {
                        await participants[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                });

                // session description protocol
                socket.on('sdp', async(data) => {
                    if (data.description.type === 'offer') {
                        if (data.description) {
                            await participants[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
                        }
                        // data.description ? await participants[data.sender].setRemoteDescription(new RTCSessionDescription(data.description)) : '';

                        help.getUserFullMedia().then(async(stream) => {
                            if (!document.getElementById('local').srcObject) {
                                help.setStream(stream);
                            }

                            //save user stream
                            myStream = stream;

                            stream.getTracks().forEach((track) => {
                                participants[data.sender].addTrack(track, stream);
                            });

                            let answer = await participants[data.sender].createAnswer();

                            await participants[data.sender].setLocalDescription(answer);

                            socket.emit('sdp', {
                                description: participants[data.sender].localDescription,
                                to: data.sender,
                                sender: socketId
                            });
                        }).catch((e) => {
                            console.error(e);
                        });
                    } else if (data.description.type === 'answer') {
                        await participants[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
                    }
                });
            });


            // retrieving and setting up the user stream
            function getAndSetUserStream() {
                help.getUserFullMedia().then((stream) => {

                    //saveing the user stream
                    myStream = stream;
                    help.setStream(stream);
                }).catch((e) => {
                    console.error(`stream error: ${ e }`);
                });
            }

            // sending message and adding it to the main session also
            function sendMsg(msg) {
                const {
                    uid,
                    photoURL
                } = user;
                var db = firebase.firestore();
                var ref;
                if (room === "Chatroom") {
                    ref = db.collection("messages");
                } else {
                    ref = db.collection("groups").doc(room).collection("messages");
                }
                ref.add({
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    text: msg,
                    uid,
                    photoURL,
                }).then((docRef) => {
                    let data = {
                        room: room,
                        msg: msg,
                        sender: username,
                        photo: photoURL,
                    };

                    //emit chat message
                    socket.emit('chat', data);

                    //add localchat
                    help.addChat(data, 'local');
                });
            }

            // function to share screen
            function shareScreen() {
                help.shareScreen().then((stream) => {
                    help.toggleShareIcons(true);

                    //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                    //It will be enabled was user stopped sharing screen
                    document.getElementById('toggle-video').disabled = true;

                    //save user screen stream
                    screen = stream;

                    //share the new stream with all partners
                    broadcastNewTracks(stream, 'video', false);

                    //When the stop sharing button shown by the browser is clicked
                    screen.getVideoTracks()[0].addEventListener('ended', () => {
                        stopSharingScreen();
                    });
                }).catch((e) => {
                    console.error(e);
                });
            }

            // mirror video button
            document.getElementById('mirror-video').addEventListener('click', () => {
                broadcastNewTracks(myStream, 'video', !mirrorMode);
                mirrorMode = !mirrorMode;
            });


            // function to stop screen sharing
            function stopSharingScreen() {
                //enable video toggle btn
                document.getElementById('toggle-video').disabled = false;
                return new Promise((res, rej) => {
                    if (screen.getTracks().length) {
                        screen.getTracks().forEach(track => track.stop());
                    }
                    res();
                }).then(() => {
                    help.toggleShareIcons(false);
                    broadcastNewTracks(myStream, 'video');
                }).catch((e) => {
                    console.error(e);
                });
            }


            // broadcasting new tracks to all the participants
            function broadcastNewTracks(stream, type, mirrorMode = true) {
                help.setStream(stream, mirrorMode);
                let track;
                if (type == 'audio') {
                    track = stream.getAudioTracks()[0];
                } else {
                    track = stream.getVideoTracks()[0];
                }
                for (let p in participants) {
                    let pName = participants[p];
                    if (typeof participants[pName] == 'object') {
                        help.replaceTrack(track, participants[pName]);
                    }
                }
            }


            // function to toggle the recording icons when it is and is not recording
            function toggleRecordingIcons(isRecording) {
                let e = document.getElementById('record');
                if (!isRecording) {
                    e.setAttribute('title', 'Record');
                    e.children[0].classList.add('text-white');
                    e.children[0].classList.remove('text-danger');
                } else {
                    e.setAttribute('title', 'Stop recording');
                    e.children[0].classList.add('text-danger');
                    e.children[0].classList.remove('text-white');
                }
            }

            // starting the recording
            function startRecording(stream) {
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9'
                });

                mediaRecorder.start(1000);
                toggleRecordingIcons(true);

                mediaRecorder.onerror = function(e) {
                    console.error(e);
                };

                mediaRecorder.onstop = function() {
                    toggleRecordingIcons(false);

                    help.downloadStream(recordedStream, username);

                    setTimeout(() => {
                        recordedStream = [];
                    }, 3000);
                };

                mediaRecorder.ondataavailable = function(e) {
                    recordedStream.push(e.data);
                };
            }


            // initializing the users
            function initialize(createOffer, partnerName) {
                participants[partnerName] = new RTCPeerConnection(help.getIceServer());

                if (screen) {
                    if (screen.getTracks().length) {
                        screen.getTracks().forEach((track) => {
                            // trigger negotiationneeded event
                            participants[partnerName].addTrack(track, screen);
                        });
                    }
                } else if (myStream) {
                    myStream.getTracks().forEach((track) => {
                        // trigger negotiationneeded event
                        participants[partnerName].addTrack(track, myStream);
                    });
                } else {
                    help.getUserFullMedia().then((stream) => {
                        // save user stream
                        myStream = stream;

                        stream.getTracks().forEach((track) => {
                            // trigger negotiationneeded event
                            participants[partnerName].addTrack(track, stream);
                        });

                        help.setStream(stream);
                    }).catch((e) => {
                        console.error(`stream error: ${ e }`);
                    });
                }




                //adding other participants
                participants[partnerName].ontrack = (e) => {
                    let str = e.streams[0];
                    if (document.getElementById(`${ partnerName }-video`)) {
                        document.getElementById(`${ partnerName }-video`).srcObject = str;
                    } else {
                        //video element
                        let newVid = document.createElement('video');
                        newVid.className = 'remote-video overflow-hidden bg-contain';
                        newVid.autoplay = true;
                        newVid.id = `${ partnerName }-video`;
                        newVid.srcObject = str;



                        //video controls elements
                        let controlDiv = document.createElement('div');
                        controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;
                        controlDiv.className = 'remote-video-controls z-10 absolute bottom-0 left-0 h-16';




                        //create a new div for card
                        let cardDiv = document.createElement('div');
                        cardDiv.id = partnerName;
                        cardDiv.className = 'h-48 w-80 bg-gray-800 flex flex-col flex-end rounded-xl p-2 room-comm relative';
                        cardDiv.appendChild(newVid);
                        cardDiv.appendChild(controlDiv);

                        //put div in main-section elem
                        document.getElementById('videos').appendChild(cardDiv);
                    }
                };


                // removing other paricipants videos when they disconnect
                participants[partnerName].onconnectionstatechange = (d) => {
                    if (participants[partnerName].iceConnectionState === 'disconnected' || participants[partnerName].iceConnectionState === 'failed' || participants[partnerName].iceConnectionState === 'closed') {
                        help.closeVideo(partnerName);
                    }
                };
                participants[partnerName].onsignalingstatechange = (d) => {
                    if (participants[partnerName].signalingState === 'closed') {
                        help.closeVideo(partnerName);
                    }
                };


                //send ice candidate to partnerNames
                participants[partnerName].onicecandidate = ({
                    candidate
                }) => {
                    socket.emit('ice candidates', {
                        candidate: candidate,
                        to: partnerName,
                        sender: socketId
                    });
                };

                //creating offer to join 
                if (createOffer) {
                    participants[partnerName].onnegotiationneeded = async() => {
                        let offer = await participants[partnerName].createOffer();
                        await participants[partnerName].setLocalDescription(offer);
                        socket.emit('sdp', {
                            description: participants[partnerName].localDescription,
                            to: partnerName,
                            sender: socketId
                        });
                    };
                }

            }

            // Sending chat messages in the char area
            document.getElementById('chat-input').addEventListener('keypress', (e) => {
                if (e.which == 13 && (e.target.value.trim())) {
                    e.preventDefault();
                    sendMsg(e.target.value);
                    setTimeout(() => {
                        e.target.value = '';
                    }, 50);
                }
            });


            //When the video icon is clicked
            document.getElementById('toggle-video').addEventListener('click', (e) => {
                let elem = document.getElementById('toggle-video');
                let icon = document.getElementById('toggle-video-icon');

                if (!myStream.getVideoTracks()[0].enabled) {
                    icon.classList.add('fa-video');
                    icon.classList.remove('fa-video-slash');
                    elem.classList.add('bg-gray-500');
                    elem.classList.remove('bg-red-500');
                    elem.setAttribute('title', 'Hide Video');

                    myStream.getVideoTracks()[0].enabled = true;

                } else {
                    icon.classList.remove('fa-video');
                    icon.classList.add('fa-video-slash');
                    elem.classList.remove('bg-gray-500');
                    elem.classList.add('bg-red-500');
                    elem.setAttribute('title', 'Show Video');

                    myStream.getVideoTracks()[0].enabled = false;

                }

                broadcastNewTracks(myStream, 'video');
            });


            //When the mute icon is clicked
            document.getElementById('toggle-mute').addEventListener('click', (e) => {

                let elem = document.getElementById('toggle-mute');
                let icon = document.getElementById('toggle-mute-icon');

                if (!myStream.getAudioTracks()[0].enabled) {
                    icon.classList.add('fa-microphone-alt');
                    icon.classList.remove('fa-microphone-alt-slash');
                    elem.classList.add('bg-gray-500');
                    elem.classList.remove('bg-red-500');
                    elem.setAttribute('title', 'Mute');

                    myStream.getAudioTracks()[0].enabled = true;
                } else {
                    icon.classList.remove('fa-microphone-alt');
                    icon.classList.add('fa-microphone-alt-slash');
                    elem.classList.remove('bg-gray-500');
                    elem.classList.add('bg-red-500');
                    elem.setAttribute('title', 'Unmute');

                    myStream.getAudioTracks()[0].enabled = false;

                }

                broadcastNewTracks(myStream, 'audio');
            });






            //When record button is clicked
            document.getElementById('record').addEventListener('click', (e) => {
                //Ask user what they want to record. Get the stream based on selection and start recording
                if (mediaRecorder) {
                    if (mediaRecorder.state == 'recording') {
                        mediaRecorder.stop();
                    } else if (mediaRecorder.state == 'paused') {
                        mediaRecorder.resume();
                    } else if (mediaRecorder.state == 'inactive') {
                        help.toggleModal('recording-options-modal', true);
                    }
                } else {
                    help.toggleModal('recording-options-modal', true);
                }
            });

            // when get-link button is clicked
            document.getElementById('get-room-link').addEventListener('click', (e) => {
                var dummyElement = document.createElement('input'),
                    text = window.location.href;
                document.body.appendChild(dummyElement);
                dummyElement.value = text;
                dummyElement.select();
                document.execCommand('copy');
                document.body.removeChild(dummyElement);
            });


            //When user clicks the 'Share screen' button
            document.getElementById('share-screen').addEventListener('click', (e) => {
                e.preventDefault();
                if (screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended') {
                    stopSharingScreen();
                } else {
                    shareScreen();
                }
            });



            //When user choose to record own video
            document.getElementById('record-video').addEventListener('click', () => {
                help.toggleModal('recording-options-modal', false);
                if (!myStream) {
                    help.getUserFullMedia().then((videoStream) => {
                        startRecording(videoStream);
                    }).catch(() => {});
                } else {
                    if (myStream.getTracks().length) {
                        startRecording(myStream);
                    }
                }
            });

            //When user choose to record screen
            document.getElementById('record-screen').addEventListener('click', () => {
                help.toggleModal('recording-options-modal', false);
                if (!screen) {
                    help.shareScreen().then((screenStream) => {
                        startRecording(screenStream);
                    }).catch(() => {});
                } else {
                    if (screen.getVideoTracks().length) {
                        startRecording(screen);
                    }
                }
            });
        } else {
            window.location.replace('/signIn.html');
        }
    });
});