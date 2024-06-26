import { DataTypes, Model, Op } from 'sequelize';
import { fetchRetry } from './helper';
export class TTJView {
    /** 
     * @param {import('sequelize').ModelStatic<any>[]} tables the tables accessible for the user to serach
     * @param {string} apiKey the API key for the text-to-json.com API
     **/
    constructor(tables, apiKey) {
        /** @type {import('sequelize').ModelStatic<any>[]} */
        this.tables = tables;
        this.apiKey = apiKey;



        /** @type {Map<string,import('sequelize').ModelStatic<any>>} */
        this.tableFilters = new Map();
    }

    /**
     * Set/overwrite the filter for a table.
     * A this filter will apply to all queries made to the table
     * 
     * @template {typeof import('sequelize').Model} M
     * 
     * @param {M|string} table 
     * @param {import('sequelize').ModelStatic<InstanceType<M>>} filter 
     */
    setTableFilter(table, filter) {
        let referencedTable;
        if (typeof table === 'string') {
            referencedTable = this.tables.find(t => this.getTableName(t) === table);
        } else {
            referencedTable = this.tables.find(t => t === table);
        }
        if (!referencedTable) {
            throw new Error(`Table ${table} not found`);
        }
        this.tableFilters.set(this.getTableName(referencedTable), filter);
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

    fixQuery(query) {
        if (typeof query !== 'object') {
            return query;
        }
        if (Array.isArray(query)) {
            query = query.map(e => this.fixQuery(e));
        }
        const sequelizeKeyRegex = /^\$(.*)/;
        if (Object.keys(query).length === 0) {
            return null;
        }
        for (const key in query) {
            const opKeys = Object.keys(Op);
            if (sequelizeKeyRegex.test(key) && opKeys.includes(key.match(sequelizeKeyRegex)[1])) {
                const value = query[key];
                delete query[key];
                query[Op[key.match(sequelizeKeyRegex)[1]]] = this.fixQuery(value);
            } else {
                query[key] = this.fixQuery(query[key]);
            }
            if (query[key] === null) {
                delete query[key];
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
        if (typeof response !== 'object' || !('query' in response) || !Array.isArray(response.query)) {
            throw new Error(`Invalid response: ${JSON.stringify(response)}`);
        }
        const queryResult = await this.executeQuery(response.query);
        const ragAnswer = await this.ragQuestion(queryResult, question);
        return { answer: ragAnswer, queryResult };
    }

    /**
     * 
     * @param {any} context the database results to generate the RAG report from
     * @param {string} question the question that was asked
     */
    async ragQuestion(context, question) {
        const response = await fetchRetry(`https://text-to-json.com/api/v1/ragQuestion?apiToken=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, context: context }),
        }).then(r => r.json());
        if (typeof response !== 'object' || !('response' in response)) {
            throw new Error(`Invalid response: ${JSON.stringify(response)}`);
        }
        return response.response;
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
                    if (typeof attr.references === 'object') {
                        serializedAttr.references = {
                            table: attr.references.model,
                            key: attr.references.key
                        };
                    } else {
                        throw new Error(`Unsupported reference type: ${attr.references}`);
                    }
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
     * @param {{table:string, sequelizeQuery:any}[]} query 
     * @returns {Promise<{table:string, results:any[]}[]>}
     */
    async executeQuery(query) {
        const results = [];
        for (const { table, sequelizeQuery } of query) {
            const Table = this.tables.find(t => this.getTableName(t) === table);
            if (!Table) {
                throw new Error(`Table ${table} not found`);
            }
            let sequelizeWhereQuery = this.fixQuery(sequelizeQuery);
            if (this.tableFilters.has(this.getTableName(Table))) {
                sequelizeWhereQuery = { [Op.and]: [sequelizeWhereQuery, this.tableFilters.get(this.getTableName(Table))] };
            }
            const result = { table, results: (await Table.findAll({ where: sequelizeWhereQuery, limit: 10, include: [{ all: true }] })).map(r => r.toJSON()) };
            results.push(result);
        }
        return results;
    }
}