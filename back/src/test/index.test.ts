const build = require('../app');
const tap = require('tap');

tap.test('that root exists', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/',
  });

  t.equal(response.statusCode, 200, 'returns 200');
  t.end();
});

tap.test('that backtest runs', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const response = await app.inject({
    method: 'POST',
    url: '/backtest',
    body: { assets: ['324053'], weights: ['0.5'] },
  });

  t.equal(response.statusCode, 200, 'returns 200');
  t.end();
});

/*
tap.test('that risk runs', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/riskattribution?dep=324053&ind=326089',
  });

  t.equal(response.statusCode, 200, 'returns 200');
  t.end();
});
*/

tap.test('that cross-country risk runs', async (t) => {
  //This was triggering an error because of a problem with merging two
  //series with different dates
  const app = build();
  t.teardown(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/riskattribution?dep=324053&ind=384688',
  });

  t.equal(response.statusCode, 200, 'returns 200');
  t.end();
});

const validConfigObj = {
  starting_cash: 1000.0, 
  nic: "A", 
  lifetime_pension_contributions: 10.0, 
  contribution_pct: 0.1, 
  emergency_cash_min: 4000.0, 
  flows: [ 
    { 
      flow_type: "Employment", 
      value: 4000.0, 
      schedule: {
        schedule_type: "EveryDay"
      }
    } 
  ], 
  stacks: [ 
    { 
      stack_type: "Isa", 
      value: 100.0
    }, 
    { 
      stack_type: "Sipp", 
      value: 100.0
    }, 
    { 
      stack_type: "Gia", 
      value: 100.0
    }
  ]
};

tap.test('that antevorta runs', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const body = {
    assets: [324053],
    weights: [0.5],
    sim_length: 10,
    runs: 10,
    sim_config: JSON.stringify(validConfigObj),
  };

  const response = await app.inject({
    method: 'POST',
    url: '/incomesim',
    body,
  }).end();

  t.equal(response.statusCode, 200, 'returns 200');
  t.end();
});

tap.test('that antevorta fails with bad input', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const body = {
    assets: [],
    weights: ['0.5'],
    sim_length: 10,
    runs: 10,
    sim_config: JSON.stringify(validConfigObj),
  };

  const response = await app.inject({
    method: 'POST',
    url: '/incomesim',
    body,
  }).end();

  t.equal(response.statusCode, 400, 'returns 400 with bad assets');
  t.end();
});

tap.test('that antevorta fails with bad input 1', async (t) => {
  const app = build();
  t.teardown(() => app.close());
 
  const body1 = {
    assets: ['324053'],
    weights: [],
    sim_length: 10,
    runs: 10,
    sim_config: JSON.stringify(validConfigObj),
  };

  const response1 = await app.inject({
    method: 'POST',
    url: '/incomesim',
    body1,
  }).end();

  t.equal(response1.statusCode, 400, 'returns 400 with bad weights');
  t.end();
});

tap.test('that user login fails without valid key', async (t) => {
  const app = build();
  t.teardown(() => app.close());
  
  const body = {
    userKey: 'test',
  };

  const response = await app.inject({
    method: 'POST',
    url: '/login',
    body,
  }).end();

  t.equal(response.statusCode, 401, 'user login returns 401 without valid key');
  t.end();
});

tap.test('that user flow works from creation to logout', async (t) => {
  const app = build();
  t.teardown(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/create',
  });
  const { userKey } = response.json();
  
  const response1 = await app.inject({
    method: 'POST',
    url: '/login',
    body: { userKey }
  });

  const response2 = await app.inject({
    method: 'GET',
    url: `/logout?userKey=${userKey}`,
    cookies: response1.cookies[0],
  });

  t.equal(response.statusCode, 200, 'returns 200 when user created successfully');
  t.equal(response1.statusCode, 200, 'returns 200 when user logged in');
  t.equal(response2.statusCode, 200, 'returns 200 when user logged out');
  t.end();
});

tap.end();
