// import { sanitize } from 'indicative/sanitizer'
const { RamenServices } = require('@ordent/ramenbox/src/Services/RamenServices')
const {
	NotFoundException,
	UnauthorizedException,
	RamenException,
} = require('@ordent/ramenbox/src/Exception')
const {
	RamenRepository,
} = require('@ordent/ramenbox/src/Repository/RamenRepository')
const {
	RamenValidatorGenerator,
} = require('@ordent/ramenbox/src/Validator/RamenValidatorGenerator')

const shortid = require('shortid')
const { requestBody } = require('@ordent/ramenbox/src/Utilities')

const Config = use('Config')
const Sentry = use('Sentry')
const Mail = use('Mail')
const User = use('RamenAuth/User')
const Profile = use('RamenAuth/Profile')
const Env = use('Env')
const Token = use('RamenAuth/Token')
class AuthServices extends RamenServices {
	constructor() {
		super(User)
		this.repositories = {
			profile: new RamenRepository(Profile),
		}
	}

	async login({ request }, auth) {
		const value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'login')
		const { email, password } = value
		let data = null
		try {
			data = await auth.withRefreshToken().attempt(email, password)
		} catch (e) {
			throw new UnauthorizedException('Email or Password is Incorrect')
		}
		if (!data) {
			throw new UnauthorizedException('Account Not Found')
		}
		data.users = await this.getRepository()
			.getModel()
			.query()
			.where('email', email)
			.first()
		data.users.profiles = await data.users.profiles().first()
		// data.roles = await data.users.getRoles()
		return this.getResponse().setStatus(200).rawItem(data)
	}

	async refresh({ request }, auth) {
		const value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'refresh')
		const { refresh_token } = value
		const data = await auth
			.newRefreshToken()
			.generateForRefreshToken(refresh_token)
		return this.getResponse().setStatus(200).rawItem(data)
	}

	async check(auth) {
		let check = null
		try {
			check = await auth.check()
		} catch (error) {
			throw new UnauthorizedException('Token Not Found')
		}
		return this.getResponse().setStatus(200).rawItem(check)
	}

	async register({ request }) {
		let validator = await this.getValidator()
		let value = await validator.sanitize(requestBody(request))
		await validator.validate(value, 'register')
		const data = await this.repository.postItem(value)
		value = await this.fillProperties(value)
		await this.updateProfileOnRegister(data, value)
		this.verifyOnRegister(data)
		return this.getResponse()
			.setStatus(200)
			.item(
				data,
				'profiles',
				this.getRepository().getModel().transformers
			)
	}

	async updateProfileOnRegister(data = null, value = {}) {
		if (data) {
			const profiles = await data.profiles().fetch()
			if (profiles) {
				const { name, phone } = value
				profiles.name = name
				profiles.phone = phone
				await profiles.save()
			}
		}
	}

	async verifyOnRegister(data = null) {
		if (data) {
			const tokens = await data.tokens().fetch()
			const token = tokens.toJSON().pop()
			if (tokens !== null && tokens.toJSON().length > 0) {
				try {
					Mail.send('verifications', token, (message) => {
						message
							.to(data.email)
							.from(Env.get('MAIL_GLOBAL_FROM'))
							.subject(Env.get('MAIL_REGISTER_SUBJECT'))
					})
				} catch (e) {
					Sentry.captureException(e)
				}
			}
		}
	}

	async getSelf(auth) {
		let data = null
		try {
			data = await auth.getUser()
		} catch (e) {
			throw new NotFoundException('User or Login Token Not found')
		}
		return this.getResponse()
			.setStatus(200)
			.item(
				data,
				'profiles',
				this.getRepository().getModel().transformers
			)
	}

	async getStatus({ request }) {
		const data = await this.getRepository()
			// .getModel()
			.getItem(request.params.id, request)

		data.check = {
			complete_email: data.status > 1,
			complete_profiles: await this.checkProfileCompletion(data),
		}

		return this.getResponse().setStatus(200).rawItem(data)
	}

	async checkProfileCompletion(data) {
		const profiles = (await data.profiles().fetch()).toJSON()
		for (const key in profiles) {
			const element = profiles[key]
			if (!element) {
				return false
			}
		}
		return true
	}

	async getDataFromToken(request) {
		const { token } = Object.assign(request.all(), request.params)
		if (!this.getCustomRepository('token')) {
			this.setCustomRepositorySingleton(
				'token',
				new RamenRepository(Token)
			)
		}
		console.log(this.getCustomRepository('token').getModel())
		const data = await this.getCustomRepository('token')
			.getModel()
			.query()
			.where('token', token)
			.where('is_revoked', false)
			.first()
		if (data === null) {
			throw new NotFoundException('users token not found')
		}
		return data
	}

	async getConfirmationFromToken({ request }) {
		const data = await this.getDataFromToken(request)
		const user = await data.users().fetch()
		if (user === null) {
			throw new NotFoundException('users not found')
		}
		return this.getResponse()
			.setTransformers(Token.transformers)
			.setStatus(200)
			.item(data, 'users, users.profiles', null)
	}

	updateDifferentProperties(item = {}, items = {}) {
		const result = {}
		for (const iterator of Object.keys(items)) {
			if (items[iterator] && item[iterator] !== items[iterator]) {
				result[iterator] = items[iterator]
			}
		}
		return result
	}

	async updateAuthenticationStatus(user, status = 'registered') {
		if (status === 'registered') {
			user.status = 1
		}
		if (status === 'validated') {
			user.status = 2
		}
		await user.tokens().where('is_revoked', true).delete()
		await user.save()
		await user.reload()
		return user
	}

	async revokeTokenInformation(data) {
		data.is_revoked = true
		await data.save()
		await data.reload()
		return data
	}

	async updateProfileWithDifferentProperties(profile, value) {
		const result = this.updateDifferentProperties(profile, value)
		profile.merge(result)
		await profile.save()
	}

	async postConfirmationFromToken({ request }) {
		const value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'validation')
		let data = await this.getDataFromToken(request)
		let user = await data.users().fetch()
		if (user === null) {
			throw new NotFoundException('users not found or already confirmed')
		}
		// update properties if different
		let profile = await user.profiles().fetch()
		if (profile === null) {
			throw new NotFoundException(
				'profile not found or already confirmed'
			)
		}
		profile = await this.updateProfileWithDifferentProperties(
			profile,
			value
		)
		// update user status
		data = await this.revokeTokenInformation(data)
		user = await this.updateAuthenticationStatus(user, 'validated')
		return this.getResponse()
			.setTransformers(Token.transformers)
			.setStatus(200)
			.item(data, 'users, users.profiles', data.transformers)
	}

	async postProfile({ request }) {
		const { id } = request.params
		let value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'put')
		this.setCustomRepositorySingleton(
			'profile',
			this.getCustomRepository('profile')
		)
		this.setCustomFilterSingleton(
			'profile',
			new (RamenValidatorGenerator(
				this.getCustomRepository('profile').getModel()
			))()
		)
		await this.getCustomFilter('profile').validate(request, 'put')

		const user = await this.getRepository().getItem(id)
		let profile = await user.profiles().first()

		value = await this.fillProperties(value)
		profile = await this.getCustomRepository('profile').putItem(
			profile.id,
			value,
			true
		)
		await profile.save()

		return this.getResponse()
			.setStatus(200)
			.item(user, 'profiles', user.transformers)
	}

	async forgotPassword({ request }) {
		const value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'forgot')
		const { email } = value
		const user = await this.getRepository()
			.getModel()
			.query()
			.where('email', email)
			.first()
		if (user === null) {
			throw new NotFoundException('users not found or already confirmed')
		}
		const token = await Token.create({
			type: 'forgot',
			token: shortid.generate(),
			is_revoked: false,
		})
		await user.tokens().save(token)
		// send email
		if (token !== null) {
			const url =
				Config._config.authConfig.appUrl || 'http://127.0.0.1:3333' // ini harus diganti host
			const verifyUrl = url + '/api/v1/forgot/verify?token=' + token.token
			user.verify_url = verifyUrl
			try {
				await Mail.send('forgot', user.toJSON(), (message) => {
					message
						.to(user.email)
						.from(Env.get('MAIL_GLOBAL_FROM'))
						.subject(Env.get('MAIL_FORGOT_SUBJECT'))
				})
				return this.getResponse().setStatus(200).rawItem({
					success: true,
					message: 'Please Check your email for confirmation',
				})
			} catch (error) {
				throw new RamenException(error)
			}
		}
	}

	async rememberPassword({ request }) {
		const value = await this.getValidator().sanitize(requestBody(request))
		await this.getValidator().validate(value, 'remember')
		delete value.password_confirmation
		let data = await this.getDataFromToken(request)
		let user = await data.users().fetch()
		if (user === null) {
			throw new NotFoundException('users not found or already changed')
		}
		delete value.token
		user = await this.updateProfileWithDifferentProperties(user, value)
		data = await this.revokeTokenInformation(data)
		return this.getResponse().setStatus(200).rawItem({
			success: true,
			message: 'Please Login with the new password',
		})
	}
}

module.exports = AuthServices
