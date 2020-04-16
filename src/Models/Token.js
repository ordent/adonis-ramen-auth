'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
// const Model = use('Model')
const { RamenModel } = require('@ordent/ramenbox/src/Model/RamenModel')
// const { RamenTransformerGenerator } = require('@ordent/ramenbox/src/Transformer/RamenTransformerGenerator')

class Token extends RamenModel {
	static get properties() {
		return ['token', 'type', 'is_revoked']
	}

	static get hidden() {
		return ['id']
	}

	static get relations() {
		return [{ users: 'available' }]
	}

	users() {
		return this.belongsTo('App/Models/User', 'user_id', 'id')
	}

	// static get transformers () {
	// 	return 'test'
	// }
}

module.exports = Token
