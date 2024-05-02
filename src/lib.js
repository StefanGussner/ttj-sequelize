import { DataTypes, Model, Op } from 'sequelize';
import { fetchRetry } from './helper';
export class TTJView {
    /** 
     * @param {typeof import('sequelize').Model[]} tables
     * @param {string} apiKey
     **/
    constructor(tables, apiKey) {
        /** @type {typeof import('sequelize').Model[]} */
        this.tables = tables;
        this.apiKey = apiKey;
    }

    /**
     * maps sequelize data types to TypeScript types 
     * @param {import('sequelize').DataType} type
     * */
    mapTypes(type) {
        switch (true) {
            case type instanceof DataTypes.NUMBER:
                return 'number';
            case type instanceof DataTypes.STRING:
                return 'string';
            case type instanceof DataTypes.DATE:
            case type instanceof DataTypes.DATEONLY:
            case type instanceof DataTypes.TIME:
                return 'Date';
            case type instanceof DataTypes.BOOLEAN:
                return 'boolean';
            default:
                throw new Error(`Unsupported data type: ${type}`);

        }
    }

    /**
     * 
     * @param {typeof Model} Table 
     */
    getTableName(Table) {
        const tn = Table.getTableName();
        /** @type {string} */
        let tableName;
        if (typeof tn === 'object') {
            tableName = tn.tableName;
        } else {
            tableName = tn;
        }
        return tableName;
    }

    addOperatorsToQuery(query) {
        if (typeof query !== 'object') {
            return query;
        }
        if (Array.isArray(query)) {
            query = query.map(e => this.addOperatorsToQuery(e));
        }
        const sequelizeKeyRegex = /^\$(.*)/;
        for (const key in query) {
            const opKeys = Object.keys(Op);
            if (sequelizeKeyRegex.test(key) && opKeys.includes(key.match(sequelizeKeyRegex)[1])) {
                const value = query[key];
                delete query[key];
                query[Op[key.match(sequelizeKeyRegex)[1]]] = this.addOperatorsToQuery(value);
            } else {
                query[key] = this.addOperatorsToQuery(query[key]);
            }
        }
        return query;
    }


    /**
     * 
     * @param {string} question 
     */
    async ask(question) {
        const tables = await this.serializeTTJView();
        const response = await fetchRetry(`https://text-to-json.com/api/v1/generateDatabaseQuery?apiToken=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, tables }),
        }).then(r => r.json());
        const queryResult = await this.executeQuery(response.query);
        return queryResult;

    }

    /**
     * 
     * @returns {Promise<{tableName:string, attributes:{name:string, type:string, references?:{table:string, key:string}}[]}[]>}
     */
    async serializeTTJView() {
        // @ts-ignore
        let serializedTables = [];
        for (const Table of this.tables) {
            // @ts-ignore
            const tableInstance = Table.build({});
            const tableName = this.getTableName(Table);
            // @ts-ignore
            const attributes = Table.getAttributes();
            let serializedAttributes = [];
            for (const attrName in attributes) {
                const attr = attributes[attrName];
                let serializedAttr = {
                    name: attrName,
                    type: this.mapTypes(attr.type),
                };
                if (attr.references) {
                    serializedAttr.references = {
                        table: attr.references.model,
                        key: attr.references.key
                    };
                }
                serializedAttributes.push(serializedAttr);
            }

            serializedTables.push({
                tableName,
                attributes: serializedAttributes
            });
        }
        return serializedTables;
    }

    /**
     * 
     * @param {{table:string, queryObject:any}[]} query 
     */
    async executeQuery(query) {
        const results = [];
        for (const { table, sequelize_query_object } of query) {
            const Table = this.tables.find(t => this.getTableName(t) === table);
            if (!Table) {
                throw new Error(`Table ${table} not found`);
            }
            const sequelizeQuery = this.addOperatorsToQuery(sequelize_query_object);
            const result = { table, results: (await Table.findAll({ where: sequelizeQuery, limit: 10, include: [{ all: true }] })).map(r => r.toJSON()) };
            results.push(result);
        }
        return results;
    }
}