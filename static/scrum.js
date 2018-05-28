function hideAll() {
    document.querySelectorAll("body > div").forEach(e => {
        e.classList.add("hidden");
    });
}


window.onload = function() {
    let sock = new WebSocket("wss://" + window.location.host + "/ws");
    let clients = undefined;

    sock.addEventListener("open", () => {
        document.querySelector("#start > .connecting").classList.add("hidden");
        document.querySelector("#start > .links").classList.remove("hidden");
    });
    sock.addEventListener("close", () => {
        hideAll();
        document.getElementById("lost").classList.remove("hidden");
    });

    sock.addEventListener('message', (msg) => {
        let message = JSON.parse(msg.data);

        if (message.command === 'new_session') {
            document.querySelector("#hostid > .id").innerText = message.id;
            document.getElementById("hostid").classList.remove("hidden");
        } else if (message.command === 'join_session') {
            document.getElementById("choose").classList.remove("hidden");
        } else if (message.command === 'clients') {
            clients = message.clients;
        } else if (message.command === 'host_choice') {
            for (let c of clients) {
                if (c.id === message.id) {
                    let li = document.createElement('li');
                    li.innerText = c.name + ': ' + message.choice;
                    document.querySelector('#hostoverview > ul').appendChild(li);
                    break;
                }
            }
        } else if (message.command === 'reveal') {
            let ul = document.querySelector('#reveal > ul');

            for (let rvd of message.data) {
                for (let c of clients) {
                    if (c.id === rvd.id) {
                        let li = document.createElement('li');
                        li.innerText = c.name + ': ' + rvd.choice;
                        ul.appendChild(li);
                        break;
                    }
                }
            }
        } else if (message.command === 'next') {
            document.getElementById("reveal").classList.add("hidden");
            document.getElementById("choose").classList.remove("hidden");
            let el = document.querySelector("#reveal > ul");
            while(el.hasChildNodes()){
                el.removeChild(el.lastChild);
            }
        }
    });

    document.getElementById("hostlink").addEventListener("click", () => {
        document.getElementById("start").classList.add("hidden");

        sock.send(JSON.stringify({
            command: 'new_session',
        }));
    });

    document.querySelector("#hostid > .next").addEventListener("click", () => {
        document.getElementById("hostid").classList.add("hidden");
        document.getElementById("hostoverview").classList.remove("hidden");
    });

    document.querySelector("#hostoverview > .next").addEventListener('click', () => {
        let el = document.querySelector("#hostoverview > ul");
        while(el.hasChildNodes()){
            el.removeChild(el.lastChild);
        }

        sock.send(JSON.stringify({
            command: 'host_next',
        }));
    });

    document.querySelector("#hostoverview > .reveal").addEventListener('click', () => {
        sock.send(JSON.stringify({
            command: 'host_reveal',
        }));
    });

    document.getElementById("joinlink").addEventListener("click", () => {
        document.getElementById("start").classList.add("hidden");
        document.getElementById("joinid").classList.remove("hidden");
    });

    document.querySelector("#joinid > .join").addEventListener("click", () => {
        document.getElementById("joinid").classList.add("hidden");
        let value = document.querySelector("#joinid > .id").value;
        let name = document.querySelector("#joinid > .name").value;

        sock.send(JSON.stringify({
            command: 'join_session',
            id: value,
            name: name,
        }));
    });

    document.querySelectorAll("#choose > ul > li > a").forEach(li => {
        li.addEventListener('click', () => {
            document.getElementById("choose").classList.add("hidden");
            document.getElementById("reveal").classList.remove("hidden");
            document.querySelector("#reveal .choice").innerText = li.innerText;
            sock.send(JSON.stringify({
                command: 'choose',
                choice: li.innerText,
            }));
        });
    });
};