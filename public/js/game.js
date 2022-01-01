// Get local credentials
const id = localStorage.getItem("id");
const username = localStorage.getItem("username");
let win = localStorage.getItem("win");
let lose = localStorage.getItem("lose");
if (!id) window.location.href = "/";

// send initial data
const socket = io(window.location.origin, { query: `id=${id}` });
socket.on("no_credential", () => {
	localStorage.removeItem("id");
	window.location.href = "/";
});

$(() => {
	const playersContainer = $("#players-container");
	const body = $("body");
	const match = $("#lblFeedback");
	const icons = $("#icons");
	const scoreBox = $(".score-box");
	const score = $(".lblScore");
	const activePlayersButton = $(".iModal");
	const modal = $("#myModal");
	const rock = $("#rock");
	const paper = $("#paper");
	const scissors = $("#scissors");
	let opponent;

	if (!opponent) socket.emit("player_free");

	socket.on("active_players", (players) => {
		console.log("get active players", players);
		playersContainer.empty();
		for (const player of players) {
			playersContainer.append(
				`<p>${player.username} - W: ${player.win} L: ${player.lose}</p>`,
			);
		}
	});

	socket.on("player_disconnected", (player) => {
		console.log("player disconnected", player);
		if (opponent && opponent.id === player.id) {
			console.log("opponent disconnected", player);
			opponent = null;
			console.log("opponent has left");
			body.css({ background: "white" });
			match.html(`${username} - ...`);
			icons.css({ opacity: 0 });
			scoreBox.css({ opacity: 0 });
			rock.css({ color: "black", "background-color": "transparent" });
			paper.css({ color: "black", "background-color": "transparent" });
			scissors.css({
				color: "black",
				"background-color": "transparent",
			});
			socket.emit("player_free");
		}
	});

	socket.on("start_game", ({ p1, p2 }) => {
		if (p1.id == id || p2.id == id) {
			opponent = p1.id == id ? p2 : p1;
			console.log("start game", opponent);
			match.html(`${username} - ${opponent.username}`);
			icons.css({ opacity: 1 });
			scoreBox.css({ opacity: 1 });
			score.html(win);
		}
	});

	socket.on("game_result", ({ winner, p1, p2 }) => {
		console.log(p1, p2);
		if (p1.id == id || p2.id == id) {
			console.log("winner", winner);
			if (!winner) {
				score.html(win);
				body.css({ background: "yellow" });
			} else if (winner.id == id) {
				win++;
				score.html(win);
				body.css({ background: "green" });
			} else {
				lose++;
				body.css({ background: "red" });
			}
			localStorage.setItem("win", win);
			localStorage.setItem("lose", lose);

			rock.css({ color: "black", "background-color": "transparent" });
			paper.css({ color: "black", "background-color": "transparent" });
			scissors.css({
				color: "black",
				"background-color": "transparent",
			});

			setTimeout(() => {
				body.css({ background: "white" });
				match.html(`${username} - ...`);
				icons.css({ opacity: 0 });
				scoreBox.css({ opacity: 0 });
				rock.css({ color: "black", "background-color": "transparent" });
				paper.css({
					color: "black",
					"background-color": "transparent",
				});
				scissors.css({
					color: "black",
					"background-color": "transparent",
				});
				socket.emit("player_free");
			}, 1000 * 2);
		}
	});

	match.html(`${username} - ...`);

	activePlayersButton.click(function () {
		socket.emit("get_active_players");
		modal.modal("show");
	});

	rock.click(function () {
		rock.css({
			color: "#ADD8E6",
			"background-color": "#FF5500",
			"border-radius": "2rem",
			padding: "0.5rem",
		});
		paper.css({ color: "black", "background-color": "transparent" });
		scissors.css({
			color: "black",
			"background-color": "transparent",
		});

		socket.emit("choice", { choice: "rock", opponent: opponent });
	});

	paper.click(function () {
		rock.css({ color: "black", "background-color": "transparent" });
		paper.css({
			color: "#ADD8E6",
			"background-color": "#FF5500",
			"border-radius": "2rem",
			padding: "0.5rem",
		});
		scissors.css({
			color: "black",
			"background-color": "transparent",
		});

		socket.emit("choice", { choice: "paper", opponent: opponent });
	});

	scissors.click(function () {
		rock.css({ color: "black", "background-color": "transparent" });
		paper.css({ color: "black", "background-color": "transparent" });
		scissors.css({
			color: "#ADD8E6",
			"background-color": "#FF5500",
			"border-radius": "2rem",
			padding: "0.5rem",
		});

		socket.emit("choice", { choice: "scissors", opponent: opponent });
	});
});
