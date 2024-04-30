import { Model, DataTypes } from 'sequelize';

/**
 * @typedef {{
 *   id: number,
 *   legalName: string,
 *   anualTurnover: number,
 * }} CustomerFields
 */

/**
 * @typedef {{
 *  id: number,
 *  offerDate: Date,
 *  offerSum: number,
 * }} CustomerOfferFields
 */

/**
 * @typedef {{
 *  id: number,
 * string: string,
 * integer: number,
 * float: number,
 * double: number,
 * date: Date,
 * dateonly: Date,
 * time: Date,
 * boolean: boolean
 * }} TestTableWithAllSequelizeTypesFields
 */

export default class DbFactory {

    /** @param {import('sequelize').Sequelize} sequelize the database connection*/
    constructor(sequelize) {
        class Customer extends Model { }

        Customer.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            legalName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            taxId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            anualTurnover: {
                type: DataTypes.FLOAT,
                allowNull: false
            },

        }, { sequelize });

        this.customer = Customer;

        class CustomerOffer extends Model { }

        CustomerOffer.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            offerDate: {
                type: DataTypes.DATE,
                allowNull: false
            },
            offerSum: {
                type: DataTypes.INTEGER,
                allowNull: false
            },

        }, { sequelize });

        this.customerOffer = CustomerOffer;

        Customer.hasMany(CustomerOffer, { onDelete: 'RESTRICT' });
        CustomerOffer.belongsTo(Customer, { onDelete: 'RESTRICT' });

        this._syncPromise = sequelize.sync({ alter: true });

        class TestTableWithAllSequelizeTypes extends Model { }

        TestTableWithAllSequelizeTypes.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            string: {
                type: DataTypes.STRING,
                allowNull: false
            },
            integer: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            float: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            double: {
                type: DataTypes.DOUBLE,
                allowNull: false
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            dateonly: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            time: {
                type: DataTypes.TIME,
                allowNull: false
            },
            boolean: {
                type: DataTypes.BOOLEAN,
                allowNull: false
            }
        }, { sequelize });

        this.testTableWithAllSequelizeTypes = TestTableWithAllSequelizeTypes;
    }

    /**
     * 
     * @returns {Promise<typeof Model<CustomerFields>>}
     */
    async getCustomer() {
        await this._syncPromise;
        return this.customer;
    }

    /**
     * 
     * @returns {Promise<typeof Model<CustomerOfferFields>>}
     */
    async getCustomerOffer() {
        await this._syncPromise;
        return this.customerOffer;
    }

    /**
     * 
     * @returns {Promise<typeof Model<TestTableWithAllSequelizeTypesFields>>}
     */
    async getTestTableWithAllSequelizeTypes() {
        await this._syncPromise;
        return this.testTableWithAllSequelizeTypes;
    }

}