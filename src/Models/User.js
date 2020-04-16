'use strict'

const shortid = require('shortid')
const { RamenModel } = require('@ordent/ramenbox/src/Model/RamenModel')
const {
	RamenTransformerGenerator,
} = require('@ordent/ramenbox/src/Transformer/RamenTransformerGenerator')
/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
// const Model = use('Model')

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash')
const Profile = use('./Profile')
const Token = use('./Token')
const Role = use('./Role')
class User extends RamenModel {
	static boot() {
		super.boot()
		this.addTrait('@provider:Lucid/Slugify', {
			fields: { username: 'email' },
			strategy: async (field, value) => {
				return await `${value.replace(/at/g, '')}-${shortid.generate()}`
			}
		})
		/**
		 * A hook to hash the user password before saving
		 * it to the database.
		 */
		this.addHook('beforeSave', async (userInstance) => {
			if (userInstance.dirty.password) {
				userInstance.password = await Hash.make(userInstance.password)
			}
		})
		this.addHook('afterCreate', async (userInstance) => {
			const token = await Token.create({
				type: 'verification',
				token: shortid.generate(),
				is_revoked: false,
			})
			await userInstance.tokens().save(token)
			if ((await userInstance.profiles().fetch()) === null) {
				await Profile.create({ user_id: userInstance.id })
			}
			const userRoles = await userInstance.getRoles()
			if (
				userRoles != null ||
				userRoles.length === 0
			) {
				const role = await Role.query().where('slug', 'waiter').first()
				userInstance.roles().attach([role.id])
			}
		})
	}

	/**
	 * A relationship on tokens is required for auth to
	 * work. Since features like `refreshTokens` or
	 * `rememberToken` will be saved inside the
	 * tokens table.
	 *
	 * @method tokens
	 *
	 * @return {Object}
	 */
	tokens() {
		return this.hasMany('App/Models/Token')
	}

	profiles() {
		return this.hasOne('App/Models/Profile')
	}

	roles() {
		return this.hasOne('App/Models/Roles', 'id', 'user_id')
	}

	static get properties() {
		return ['id', 'email', 'password', 'username', 'credit']
	}

	static get traits() {
		return [
			'@provider:Adonis/Acl/HasRole',
			'@provider:Adonis/Acl/HasPermission',
		]
	}

	static get rules() {
		return {
			register: {
				email: 'required|unique:users',
				password: 'required|min:6|confirmed',
				password_confirmation: 'required',
				name: 'required',
				phone: 'required|unique:profiles',
			},
			validation: {},
			refresh: { refresh_token: 'required' },
			login: {
				email: 'required',
				password: 'required',
			},
			forgot: { email: 'required' },
			remember: { password: 'required|confirmed' },
			post: {
				email: 'required|unique:users',
				password: 'required|min:6|confirmed',
				password_confirmation: 'required',
			},
		}
	}

	static get files() {
		return []
	}

	static get hidden() {
		return ['password']
	}

	static get sanitize() {
		return { post: { email: 'normalize_email' } }
	}

	static get relations() {
		return [{ tokens: '', profiles: 'test' }]
	}

	static get slug() {
		return 'email'
	}

	static get transformers() {
		return RamenTransformerGenerator(this)
	}
}

module.exports = User
