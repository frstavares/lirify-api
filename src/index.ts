import fetch from 'node-fetch';
import * as express from 'express';
import * as cors from 'cors';
import * as passport from 'passport';
import * as jsd from 'jsdom';
const SpotifyStrategy = require('passport-spotify').Strategy;

const app = express();
const port = process.env.PORT || 3005;

app.use(express.json());
app.use(cors());
console.log(process);
app.listen(port, () => {
	console.log(`> Ready On Server http://${(process as any).env.HOST}:${port}`);
});

const clientID = '6569af9a855a4837ba83e6518597de53';
const clientSecret = '2c76a66b557d4995900000ac32b66f1f';
const redirectUrl = `http://${(process as any).env.HOST}:3000/`;

/**
 * Passport session setup.
 * To support persistent login sessions, Passport needs to be able to
 * serialize users into and deserialize users out of the session. Typically,
 * this will be as simple as storing the user ID when serializing, and finding
 * the user by ID when deserializing. However, since this example does not
 * have a database of user records, the complete spotify profile is serialized
 * and deserialized.
 **/
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});

/**
 * Use the SpotifyStrategy within Passport.
 * Strategies in Passport require a `verify` function, which accept
 * credentials (in this case, an accessToken, refreshToken, expires_in
 * and spotify profile), and invoke a callback with a user object.
 **/
passport.use(
	new SpotifyStrategy(
		{
			clientID,
			clientSecret,
			callbackURL: `http://${(process as any).env.HOST}:${port}/callback`,
		},
		async (accessToken: any, refreshToken: any, expiresIn: any, profile: any, done: any) => {
			// To keep the example simple, the user's spotify profile is returned to
			// represent the logged-in user. In a typical application, you would want
			// to associate the spotify account with a user record in your database,
			// and return that user instead.
			console.log('Access token:', accessToken);
			console.log('Refresh token:', refreshToken);
			console.log('Expiren in:', expiresIn);
			console.log('Profile:', profile);
			return done(null, { profile, accessToken, refreshToken, expiresIn });
		},
	),
);

/**
 * Initialize Passport! Also use passport.session() middleware, to support
 * persistent login sessions (recommended).
 **/
app.use(passport.initialize());
app.use(passport.session());

/**
 * GET /auth/spotify
 * Use passport.authenticate() as route middleware to authenticate the
 * request. The first step in spotify authentication will involve redirecting
 * the user to spotify.com. After authorization, spotify will redirect the user
 * back to this application at /auth/spotify/callback
 */
app.get(
	'/auth/spotify',
	passport.authenticate('spotify', {
		scope: [
			// Images
			'ugc-image-upload',
			// Spotify Connect
			'user-read-playback-state',
			'user-modify-playback-state',
			'user-read-currently-playing',
			// Playback
			'streaming',
			'app-remote-control',
			// Users
			'user-read-email',
			'user-read-private',
			// Playlists
			'playlist-read-collaborative',
			'playlist-modify-public',
			'playlist-read-private',
			'playlist-modify-private',
			// Library
			'user-library-modify',
			'user-library-read',
			// Listening History
			'user-top-read',
			'user-read-playback-position',
			'user-read-recently-played',
			// Follow
			'user-follow-read',
			'user-follow-modify',
		],
	}),
	(_req, _res) => {
		/**
		 * The request will be redirected to spotify for authentication, so this
		 * function will not be called.
		 **/
	},
);

/**
 * GET /auth/spotify/callback
 * Use passport.authenticate() as route middleware to authenticate the
 * request. If authentication fails, the user will be redirected back to the
 * login page. Otherwise, the primary route function function will be called,
 * which, in this example, will redirect the user to the home page.
 **/
app.get(
	'/callback',
	passport.authenticate('spotify', { failureRedirect: '/login' }),
	(req, res) => {
		// If login was successful
		const user = req.user as { accessToken: string; expiresIn: number; refreshToken: string };

		res.redirect(
			`${redirectUrl}?accessToken=${user?.accessToken}&refreshToken=${user.refreshToken}&expiresIn=${user.expiresIn}`,
		);
	},
);

app.get('/logout', (req, res) => {
	req.logout();
	res.redirect(redirectUrl);
});

app.get('/lyrics', async (req, res) => {
	const query = req.query.q;

	if (!query) {
		res.status(404);
		res.send();

		return;
	}
	const searchResults = await fetch(
		`https://genius.com/api/search/multi?q=${encodeURI(query as string)}`,
	);

	if (searchResults) {
		const geniusResponse = await searchResults.json();

		console.log(geniusResponse.response.sections);
		const section = geniusResponse.response.sections.find(
			(section: any) => section.type === 'top_hit',
		);

		if (!section) {
			res.status(404);
			res.send();

			return;
		}

		const lyricsResult = section.hits[0];
		console.log(lyricsResult);

		if (!lyricsResult) {
			res.status(404);
			res.send();

			return;
		}

		const geniusLyricsResponse = await fetch(lyricsResult.result.url);
		const dom = new jsd.JSDOM(await geniusLyricsResponse.text());
		const lyricsClass = dom.window.document.getElementsByClassName('lyrics');

		if (lyricsClass) {
			res.send({
				lyrics: lyricsClass[0].textContent,
			});
			res.status(200);
		}
	}
});
