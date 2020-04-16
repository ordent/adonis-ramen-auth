const { ServiceProvider } = require('@adonisjs/fold')
import { env } from '@adonisjs/env/build/standalone'

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
	}

	boot() {
		// optionally do some initial setup
	}
}

module.exports = RamenAuthProvider
