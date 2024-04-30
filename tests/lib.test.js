import { expect, test } from '@jest/globals';
import DbFactory from './testmodels/db-factory';
import { Sequelize } from 'sequelize';
import { TTJView } from '../src/lib';

test('serializes relations', async () => {
    const dbFactory = new DbFactory(new Sequelize('sqlite::memory'));
    const Customer = await dbFactory.getCustomer();
    const CustomerOffer = await dbFactory.getCustomerOffer();

    const view = new TTJView([Customer, CustomerOffer], process.env.TTJ_API_TOKEN);
    const serialized = await view.serializeTTJView();
    expect(serialized[0].tableName).toBe('Customers');
    //should contain the foreign key
    expect(serialized[1].attributes).toContainEqual({
        name: 'CustomerId',
        type: 'number',
        references: { table: 'Customers', key: 'id' }
    }
    );
});

test('serializes all data types', async () => {
    const dbFactory = new DbFactory(new Sequelize('sqlite::memory'));
    const Customer = await dbFactory.getCustomer();
    const view = new TTJView([Customer], process.env.TTJ_API_TOKEN);
    const serialized = await view.serializeTTJView();
    expect(serialized[0].attributes).toContainEqual({
        name: 'id',
        type: 'number'
    });
    expect(serialized[0].attributes).toContainEqual({
        name: 'legalName',
        type: 'string'
    });
    expect(serialized[0].attributes).toContainEqual({
        name: 'taxId',
        type: 'string'
    });
    expect(serialized[0].attributes).toContainEqual({
        name: 'anualTurnover',
        type: 'number'
    });
});

test('temp test', async () => {
    expect.assertions(2);
    const dbFactory = new DbFactory(new Sequelize('sqlite::memory'));
    const Customer = await dbFactory.getCustomer();
    const CustomerOffer = await dbFactory.getCustomerOffer();
    const newoffer = CustomerOffer.build({
        offerDate: new Date(),
        offerSum: 1000
    });
    await newoffer.save();
    const view = new TTJView([Customer, CustomerOffer], process.env.TTJ_API_TOKEN);
    const results = await view.ask('find me all customer offers with an offer sum over 100');
    expect(results[0]).toHaveLength(1);
    const secondResults = await view.ask('find me all customer offers with an offer sum over 1000');
    expect(secondResults[0]).toHaveLength(0);
}, 120000);

