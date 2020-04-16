'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
// const Model = use('Model')
const { RamenModel } = require('@ordent/ramenbox/src/Model/RamenModel')

class Profile extends RamenModel {
	boot() {
		this.addHook('beforeSave', async (profileInstance) => {
			if (profileInstance.dirty.phone) {
				profileInstance.phone = await profileInstance.phone.replace(
					/^0+/,
					'+62'
				)
			}
		})
	}

	static get properties() {
		return [
			'id',
			'name',
			'birthdate',
			'birthplace',
			'education',
			'occupation',
			'status',
			'siblings_order',
			'user_id',
			'phone',
			'images',
			'address',
		]
	}

	static get relations() {
		return []
	}

	static get files() {
		return { images: 'jpg' }
	}
}

module.exports = Profile
