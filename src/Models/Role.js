'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
// const Model = use('Model')
const { RamenModel } = require('@ordent/ramenbox/src/Model/RamenModel')

class Role extends RamenModel {
	static get properties() {
		return ['name', 'slug', 'description']
	}

	// static get hidden() {
	// 	return ['id']
	// }

	static get relations() {
		return [{ users: 'available' }]
	}

	users() {
		return this.belongsTo('./User', 'user_id', 'id')
	}
}

module.exports = Role
