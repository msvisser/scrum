window.onload = function() {
    function hideAll() {
        document.querySelectorAll("#container > div").forEach(e => {
            e.classList.add("hidden");
        });
    }

    function sfunc(a, b) {
        let ia = parseFloat(a.choice);
        let ib = parseFloat(b.choice);

        if (isNaN(ib)) return -1;
        if (isNaN(ia)) return 1;
        if (ia < ib) return -1;
        if (ia > ib) return 1;
        return 0;
    }

    let sock = new WebSocket("ws://" + window.location.host + "/ws");
    let clients = undefined;
    let host_choices = [];

    sock.addEventListener("open", () => {
        document.querySelector("#start > .connecting").classList.add("hidden");
        document.querySelector("#start > .links").classList.remove("hidden");
    });
    sock.addEventListener("close", () => {
        hideAll();
        document.getElementById("lost").classList.remove("hidden");
        document.querySelector("#clientcount .num").innerText = '';
    });

    sock.addEventListener('message', (msg) => {
        let message = JSON.parse(msg.data);

        if (message.command === 'new_session') {
            document.querySelector("#hostid > .id").innerText = message.id;
            document.querySelector("#clientcount .hostid").innerText = message.id;
            document.getElementById("hostid").classList.remove("hidden");
        } else if (message.command === 'join_session') {
            document.getElementById("choose").classList.remove("hidden");
        } else if (message.command === 'clients') {
            clients = message.clients;
            document.querySelector("#clientcount .num").innerText = clients.length;
        } else if (message.command === 'host_choice') {
            host_choices = host_choices.filter((c) => c.id !== message.id);
            host_choices.push({
                id: message.id,
                choice: message.choice,
            });
            host_choices.sort(sfunc);

            let el = document.querySelector("#hostoverview > ul");
            while(el.hasChildNodes()){
                el.removeChild(el.lastChild);
            }
            for (let d of host_choices) {
                for (let c of clients) {
                    if (c.id == d.id) {
                        let li = document.createElement('li');
                        li.innerText = c.name + ': ' + d.choice;
                        el.appendChild(li);
                        break;
                    }
                }
            }
        } else if (message.command === 'reveal') {
            hideAll();
            document.getElementById("reveal").classList.remove("hidden");
            let ul = document.querySelector('#reveal > ul');
            while(ul.hasChildNodes()){
                ul.removeChild(ul.lastChild);
            }

            message.data.sort(sfunc);
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
            hideAll();
            document.getElementById("choose").classList.remove("hidden");
            let el = document.querySelector("#reveal > ul");
            while(el.hasChildNodes()){
                el.removeChild(el.lastChild);
            }
            document.querySelectorAll("#choose .select li").forEach(li => {
                li.classList.remove("highlight");
            });
        } else if (message.command === 'hackerman') {
            hideAll();
            document.getElementById("hackerman").classList.remove("hidden");
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
        host_choices = [];
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

        document.querySelector("#clientcount .hostid").innerText = value;
        sock.send(JSON.stringify({
            command: 'join_session',
            id: value,
            name: name,
        }));
    });

    document.querySelectorAll("#choose .select").forEach(a => {
        a.addEventListener('click', () => {
            document.querySelectorAll("#choose .select li").forEach(li => {
                li.classList.remove("highlight");
            });
            let li = a.querySelector('li');
            li.classList.add("highlight");
            document.querySelector("#reveal .choice").innerText = li.innerText;
            sock.send(JSON.stringify({
                command: 'choose',
                choice: li.innerText,
                hmac: li.getAttribute("x-hmac"),
            }));
        });
    });
};