const { ServiceProvider } = require('@adonisjs/fold')
const { env } = require('@adonisjs/env/build/standalone')

class RamenAuthProvider extends ServiceProvider {
	register() {
		// register bindings
		this.app.singleton('RamenAuth/User', () => {
			const User = this.app.use(env.get('USER_MODEL'))
			return User
		})
		this.app.singleton('RamenAuth/Profile', () => {
			const Profile = this.app.use(env.get('PROFILE_MODEL'))
			return Profile
		})

		this.app.singleton('RamenAuth/Token', () => {
			const Token = this.app.use(env.get('Token_MODEL'))
			return Token
		})
	}

	boot() {
		// optionally do some initial setup
	}
}

module.exports = RamenAuthProvider
