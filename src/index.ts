import express from "express";
import * as pogger from "pogger";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { json, urlencoded } from "body-parser";
import { get, set } from "./redis";
import { Snowflake } from "./utils/snowflake";
import { CONFIG } from "./config";
import { IMatch, IUser } from "./types";

const app = express();
const users = new Map<string, IUser>();
const online = new Map<string, IUser>();
const freePlayers = new Map<string, IUser>();
const matches = new Map<string, IMatch>();

// sending html file directly
app.use(express.static("public"));

app.use(urlencoded({ extended: false }));
app.use(json());

// create profile
app.post("/credentials", async (req, res) => {
	const { username, id } = req.body;
	if (!username)
		return res.status(400).json({ message: "username expected" });
	const userID = id || Snowflake.generate();
	await set(userID, { id: userID, username, win: 0, lose: 0 });
	users.set(userID, { id: userID, username, win: 0, lose: 0 });
	return res.status(201).json({ id: userID, username, win: 0, lose: 0 });
});

const server = app.listen(CONFIG.PORT, "0.0.0.0", () => {
	pogger.success(
		`Express server listenin on ${(server.address() as AddressInfo).port}`,
	);
});

// Initialize socket.io server
const io = new Server(server, {
	cors: {
		origin: `http://localhost:${CONFIG.PORT},https://rps.fly.dev/`,
	},
});

io.sockets.on("connection", async (socket) => {
	const id = socket.handshake.query.id as string;
	const credentials = (users.has(id)
		? users.get(id)
		: await get<IUser>(id)) as IUser;
	if (!credentials || !credentials.id) {
		socket.emit("no_credential");
	} else {
		users.set(id, credentials);
		online.set(id, credentials);

		socket.on("get_active_players", () => {
			pogger.info(`${id} requested active players`);
			socket.emit("active_players", Array.from(online.values()));
		});

		socket.on("player_free", () => {
			pogger.info(`${id} became free`);
			freePlayers.set(id, credentials);
			matches.delete(id);
			if (Array.from(freePlayers).length >= 2) {
				const [p1, p2] = Array.from(freePlayers);
				freePlayers.delete(p1[0]);
				freePlayers.delete(p2[0]);
				matches.set(p1[0], {
					p1: {
						choice: "",
						user: p1[1],
					},
					p2: {
						choice: "",
						user: p2[1],
					},
					done: false,
				});
				io.emit("start_game", { p1: p1[1], p2: p2[1] });
			}
		});

		socket.on(
			"choice",
			async ({
				choice,
				opponent,
			}: {
				choice: string;
				opponent: IUser;
			}) => {
				pogger.info(`${id} chose ${choice}`);

				const match = (matches.get(opponent.id) ||
					matches.get(id)) as IMatch;
				if (match && match.done) return;

				match.p1.user.id == id
					? (match.p1.choice = choice)
					: (match.p2.choice = choice);
				matches.set(id, match);

				if (match.p1.choice && match.p2.choice) {
					match.done = true;
					matches.set(id, match);

					const p1Choice = match.p1.choice;
					const p2Choice = match.p2.choice;

					const winner =
						p1Choice == "rock" && p2Choice == "scissors"
							? match.p1.user
							: p2Choice == "rock" && p1Choice == "scissors"
							? match.p2.user
							: p1Choice == "paper" && p2Choice == "rock"
							? match.p1.user
							: p2Choice == "paper" && p1Choice == "rock"
							? match.p2.user
							: p1Choice == "scissors" && p2Choice == "paper"
							? match.p1.user
							: p2Choice == "scissors" && p1Choice == "paper"
							? match.p2.user
							: null;

					if (winner) {
						const loser =
							winner.id == match.p1.user.id
								? match.p2.user
								: match.p1.user;
						winner.win++;
						loser.lose++;
						await set(loser.id, loser);
						users.set(loser.id, loser);
						await set(winner.id, winner);
						users.set(winner.id, winner);
					}

					pogger.info("game end", winner?.username);

					io.emit("game_result", {
						winner,
						p1: match.p1.user,
						p2: match.p2.user,
					});
				}
			},
		);

		socket.on("disconnect", (reason) => {
			pogger.info(`${id} disconnected`);
			online.delete(id);
			freePlayers.delete(id);
			matches.delete(id);
			io.emit("player_disconnected", credentials);
			pogger.info(`${id} disconnected: ${reason}`);
		});
	}
});
