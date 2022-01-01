export interface IUser {
	id: string;
	username: string;
	win: number;
	lose: number;
}

export interface IMatch {
	p1: {
		user: IUser;
		choice: string;
	};
	p2: {
		user: IUser;
		choice: string;
	};
	done: boolean;
}
