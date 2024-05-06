import { expect, test } from '@jest/globals';
import DbFactory from './testmodels/db-factory';
import { Sequelize, Op } from 'sequelize';
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

test('basic ask works', async () => {
    expect.assertions(4);
    const dbFactory = new DbFactory(new Sequelize('sqlite::memory'));
    const Customer = await dbFactory.getCustomer();
    const CustomerOffer = await dbFactory.getCustomerOffer();
    const newCustomer = Customer.build({
        legalName: 'Test',
        taxId: '123456',
        anualTurnover: 1000
    });
    await newCustomer.save();
    const newOffer = CustomerOffer.build({
        offerDate: new Date(),
        offerSum: 1000,
        CustomerId: newCustomer.id
    });
    await newOffer.save();
    const view = new TTJView([Customer, CustomerOffer], process.env.TTJ_API_TOKEN);
    const results = await view.ask('find me all customer offers with an offer sum over 100 and their customers');
    expect(results.queryResult[0].table).toBe('CustomerOffers');
    expect(results.queryResult[0].results).toHaveLength(1);
    const secondResults = await view.ask('find me all customer offers with an offer sum over 1000');
    expect(secondResults.queryResult[0].table).toBe('CustomerOffers');
    expect(secondResults.queryResult[0].results).toHaveLength(0);
}, 120_000);

test('ask respects filters', async () => {
    expect.assertions(4);
    const dbFactory = new DbFactory(new Sequelize('sqlite::memory'));
    const Customer = await dbFactory.getCustomer();
    const CustomerOffer = await dbFactory.getCustomerOffer();
    const newCustomer = Customer.build({
        legalName: 'Test',
        taxId: '123456',
        anualTurnover: 1000
    });
    await newCustomer.save();
    const newOffer = CustomerOffer.build({
        offerDate: new Date(),
        offerSum: 1000,
        CustomerId: newCustomer.id
    });
    await newOffer.save();
    const view = new TTJView([Customer, CustomerOffer], process.env.TTJ_API_TOKEN);
    const results = await view.ask('find me all customer offers with an offer sum over 100 and their customers');
    expect(results.queryResult[0].table).toBe('CustomerOffers');
    expect(results.queryResult[0].results).toHaveLength(1);
    view.setTableFilter('CustomerOffers', { offerDate: { [Op.lt]: new Date(new Date().getTime() - (24 * 60 * 60 * 1000)) } });
    const secondResults = await view.ask('find me all customer offers with an offer sum over 100 and their customers');
    expect(secondResults.queryResult[0].table).toBe('CustomerOffers');
    expect(secondResults.queryResult[0].results).toHaveLength(0);
}, 240_000);