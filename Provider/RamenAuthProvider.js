const { ServiceProvider } = require('@adonisjs/fold')
const Env = use('Env')
class RamenAuthProvider extends ServiceProvider {
	register() {
		// register bindings
		this.app.singleton('RamenAuth/User', () => {
			const User = this.app.use(Env.get('USER_MODEL'))
			return User
		})
		this.app.singleton('RamenAuth/Profile', () => {
			const Profile = this.app.use(Env.get('PROFILE_MODEL'))
			return Profile
		})
	}

	boot() {
		// optionally do some initial setup
	}
}

module.exports = RamenAuthProvider
