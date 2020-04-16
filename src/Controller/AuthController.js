'use strict'

const {
	RamenController,
} = require('@ordent/ramenbox/src/Controller/RamenController')

const {
	NotFoundException,
	UnauthorizedException,
	RamenException
} = require('@ordent/ramenbox/src/Exception')

const Config = use('Config')
const Env = use('Env')
const User = use('../Models/User')
const AuthService = use('../Service/AuthService')
class AuthController extends RamenController {
	constructor() {
		super(new AuthService(User))
	}
	// login, logout, user, refresh token, update profile, user status
	async login({ request, response, transform, auth }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().login({ request }, auth)
		return data
	}

	async getUser({ response, transform, auth }) {
		let data = null
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		data = await this.getServices().getSelf(auth)
		return data
	}

	async refresh({ request, response, transform, auth }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().refresh({ request }, auth)
		return data
	}

	async postProfile({ request, response, transform, auth }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)

		const { id } = request.params
		const user = await this.getServices().getRepository().getItem(id)
		try {
			const authUser = await auth.getUser()
			const authRole = await authUser.getRoles()
			if (
				(authUser.id !== user.id) &&
				!(authRole.includes('super') || authRole.includes('administrator'))
			) {
				throw new UnauthorizedException('Not authorized')
			}
		} catch (error) {
			throw new UnauthorizedException(error.message)
			// return error.message || 'Missing or invalid jwt token'
		}

		const data = await this.getServices().postProfile({ request}, auth )
		return data
	}

	async getStatus({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().getStatus({ request })
		return data
	}
	// register, email confirmation
	async register({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().register({ request })
		return data
	}

	async getConfirmationFromToken({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().getConfirmationFromToken({
			request,
		})
		return data
	}

	async postConfirmationFromToken({ request, response, transform, auth }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().postConfirmationFromToken(
			{ request },
			auth
		)
		return data
	}

	// forgot password, get status

	async postForgot({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().forgotPassword({ request })
		return data
	}

	async forgotPassVerify({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().getConfirmationFromToken({
			request,
		})
		const redirectUrl = Config._config.authConfig.redirectUrl
		if (redirectUrl) {
			const url = `${redirectUrl}?token=${data.data.token}`
			response.redirect(url)
		} else {
			return 'Redirect URL not provided'
		}
	}

	async forgotChangePass({ request, response, transform }) {
		this.getServices().getResponse().setResponse(response)
		this.getServices().getResponse().setManager(transform)
		const data = await this.getServices().rememberPassword({ request })
		return data
	}
}

module.exports = AuthController
