// Project-specific lint rules (see docs/policies.md).

const isUseState = node => {
  const callee = node.callee;

  return (
    (callee.type === 'Identifier' && callee.name === 'useState') ||
    (callee.type === 'MemberExpression' && callee.property.name === 'useState')
  );
};

/** One `useState` holding an object beats many: a component may call it at most `max` times. */
const maxUseState = {
  meta: {
    type: 'suggestion',
    schema: [{ type: 'object', properties: { max: { type: 'integer' } }, additionalProperties: false }],
    messages: {
      tooMany:
        'Found {{count}} useState calls (max {{max}}). Combine the state into one object with one update handler.',
    },
  },
  create: context => {
    const max = context.options[0]?.max ?? 2;
    const counts = [];

    const enter = () => {
      counts.push(0);
    };

    const exit = node => {
      const count = counts.pop();

      if (count > max) {
        context.report({ node, messageId: 'tooMany', data: { count, max } });
      }
    };

    return {
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
      CallExpression: node => {
        if (counts.length > 0 && isUseState(node)) {
          counts[counts.length - 1] += 1;
        }
      },
    };
  },
};

const policies = { rules: { 'max-use-state': maxUseState } };

export default policies;
