import help from './helpers.js';

window.addEventListener('load', () => {

    // controliing other's videos
    document.addEventListener('click', (e) => {
        if (e.target) {
            if (e.target.classList.contains('mute-remote-mic')) {
                help.muteButtonOthers(e);
            } else if (e.target.classList.contains('expand-remote-video')) {
                help.maximiseStreamOthers(e);
            }
        }
    });

    //When the chat icon is clicked
    document.querySelector('#toggle-chat-pane').addEventListener('click', (e) => {
        let chatElem = document.querySelector('#chat-pane');
        chatElem.classList.toggle('hidden');
        chatElem.classList.toggle('chat-opened');
        //remove the 'New' badge on chat icon, if present, once chat is opened.
        setTimeout(() => {
            if (document.querySelector('#chat-pane').classList.contains('chat-opened')) {
                help.toggleChatNotificationBadge();
            }
        }, 300);
    });



    // leaving the meet
    document.getElementById('leaveMeet').addEventListener('click', () => {
        window.location.replace("/");
    });

    // toggling between the record section
    document.getElementById('closeModal').addEventListener('click', () => {
        help.toggleModal('recording-options-modal', false);
    });

});