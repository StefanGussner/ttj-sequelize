import jest from 'eslint-plugin-jest';
export default [
    {
        plugins: ['jest'],

        files: [
            '**/*.test.js',
        ],
        ...jest.configs['flat/recommended'],
    },
    {
        rules: {
            indent: [
                'error',
                4,
                {
                    'SwitchCase': 1
                }
            ],
            'linebreak-style': [
                'error',
                'unix'
            ],
            'quotes': [
                'error',
                'single'
            ],
            'semi': [
                'error',
                'always'
            ],
            'no-unused-vars': 'warn',
        },
        files: [
            'src/**/*.js',
            'tests/**/*.js',
        ]
    }];