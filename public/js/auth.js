// Get local credentials
const id = localStorage.getItem("id");
if (id) window.location.href = "/game.html";

const button = $("#login");
const username = $("#username");

// get user id from server
button.click(async () => {
	const usernameValue = username.val();
	if (!usernameValue) return alert("Username  expected");
	const res = await fetch("/credentials", {
		method: "POST",
		body: JSON.stringify({ username: usernameValue }),
		headers: {
			"Content-Type": "application/json",
		},
	});
	if (res.status != 201) return alert("A valid username expected");
	const body = await res.json();
	localStorage.setItem("id", body.id);
	localStorage.setItem("username", body.username);
	localStorage.setItem("win", body.win);
	localStorage.setItem("lose", body.lose);
	window.location.href = "/game.html";
});
