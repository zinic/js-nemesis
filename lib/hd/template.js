(function () {
	var S_START = 'S_START';
	var S_COMMAND = 'S_COMMAND';
	var S_STRDATA = 'S_STRDATA';
	var S_TOKEN_START = 'S_TOKEN_START';
	var S_TOKEN_MATCHING = 'S_TOKEN_MATCHING';
	var S_CMD_COND_STATEMENT = 'S_CMD_COND_STATEMENT';
	var S_CMD_VAR_REFERENCE = 'S_CMD_VAR_REFERENCE';

	var TOKEN_COND_STATEMENT = new Token(
		// Token starts at index 0 and matches (
		'(', 0,

		// Jump to condition statement when matched
		function (manager) {
			manager.jump(S_CMD_COND_STATEMENT);
		}
	);

	var TOKEN_COND_START = new Token(
		// Token starts at index 1 and matches f
		'if', 1,

		function (manager) {
			// Signal the start of a new condition
			manager.jump(S_TOKEN_START, TOKEN_COND_STATEMENT);
		}
	);

	var TOKEN_COND_END = new Token(
		// Token starts at index 1 and matches ndif
		'endif', 1,

		function (manager) {
			if (is_not_set(manager.node.parent)) {
				throw 'Unexpected endif';
			}

			manager.node = manager.node.parent;
			manager.jump(S_STRDATA);
		}
	);

	function Token(token, initial_position, action) {
		this.initial_position = initial_position;
		this.position = initial_position;
		this.action = action;
		this.token = token;

		this.reset = function () {
			this.position = this.initial_position;
		};

		this.next = function (manager, ch) {
			// Check if this character matches the next character in the token
			if (ch === token[this.position]) {
				this.position += 1;

				// Check if we're done with this token
				if (token.length <= this.position) {
					// Run our completion action if we matched successfully
					this.action(manager);
				}
			} else {
				throw 'Unexpected character "' + ch + '" for token: ' + this.token;
			}
		};

		this.done = function () {
			this.action();
		};
	};

	function TemplateNode(type, payload) {
		this.children = [];
		this.payload = payload;
		this.parent = undefined;
		this.type = type;

		this.add = function (child) {
			// Set a parent reference
			child.parent = this;

			// Add the child to our references
			this.children.push(child);
		};

		this.each_child = function (visitor) {
			// Simple iterator function for visiting a node's children
			for (var i in this.children) {
				visitor(this.children[i]);
			}
		};
	};

	function StateManager(start_state, current_node) {
		this.state = start_state;
		this.token = undefined;
		this.node = current_node;

		this.jump = function (next_state, next_token) {
			if (this.state == next_state) {
				throw 'Jumping to the same state is illegal: ' + this.state;
			}

			this.state = next_state;

			if (is_set(next_token)) {
				this.token = next_token;
			}
		};
	};

	function TemplateManager() {
		var loaded_templates = {};
		var self = this;

		this.is_whitespace = function (ch) {
			return ch === ' ' || ch === '\r' || ch === '\n' || ch === '\t';
		};

		this.load = function (name, path, on_completion) {
			if (loaded_templates[name] == undefined) {
				// load the template and then call on_completion
				$.ajax({
					url: path,
					dataType: 'text',

					success: function (data) {
						var template = self.parse(data);
						self.compile(template);
						loaded_templates[name] = template

						on_completion();
					},

					error: function (err) {
						System.panic(err);
					}
				});
			} else {
				// call on_completion right now if the template already exists
				on_completion();
			}
		};

		this.get = function (name) {
			var template = loaded_templates[name];

			if (template == undefined) {
				throw 'Template ' + name + ' is not loaded!';
			}

			return template;
		};

		this.walk = function (tdoc, visitor) {
			var depth_stack = [{
				'index': 0,
				'node': tdoc
			}];

			// Visit the root first
			if (visitor(tdoc)) {
				while (depth_stack.length > 0) {
					var next = depth_stack.pop();

					if (next.index < next.node.children.length) {
						var next_child = next.node.children[next.index];

						// Increase our index and then push the parent
						next.index += 1;
						depth_stack.push(next);

						// Visit this child
						if (!visitor(next_child)) {
							continue;
						}

						// Push the new child
						depth_stack.push({
							'index': 0,
							'node': next_child
						});
					}
				}
			}
		};

		this.execute = function (name, scope) {
			return this._execute(this.get(name), scope);
		};

		this._execute = function (tdoc, scope) {
			var output = '';

			if (is_not_set(scope)) {
				scope = {};
			}

			this.walk(tdoc, function (node) {
				var descend = true;

				switch (node.type) {
					case 'condition':
						// Only include the condition's children nodes if the condition evaluates to true
						descend = node.compiled(scope);
						break;

					case 'var':
						output += node.compiled(scope);
						break;

					default:
						output += node.payload;
				}

				return descend;
			});

			return output;
		};

		this.compile = function (tdoc) {
			this.walk(tdoc, function (node) {
				switch (node.type) {
					case 'condition':
					case 'var':
						var func = '(function () { return function (scope) { with (scope) { return ' + node.payload + ';}}})();';

						try {
							System.log('Compiling function: ' + func + ' --> ' + node.compiled);
							node.compiled = eval(func);
						} catch (exception) {
							System.panic(exception);
						}
						break;

					default:
				}

				return true;
			});
		};

		this.parse = function (template) {
			// All documents have a null root node
			var tdoc = new TemplateNode('root', '');

			// State tracking
			var manager = new StateManager(S_START, tdoc);

			var escaped = false;
			var strbuf = '';
			var depth = 0;

			console.log()

			for (var i in template) {
				var ch = template[i];

				switch (manager.state) {
					case S_START:
						manager.state = S_STRDATA;

					case S_STRDATA:
						if (escaped) {
							strbuf += ch;
							escaped = false;
							break;
						}

						switch (ch) {
							case '$':
								if (strbuf.length > 0) {
									// Push a new string node
									manager.node.add(new TemplateNode('string', strbuf));
									strbuf = '';
								}

								manager.jump(S_COMMAND);
								break;

							case '\\':
								escaped = true;
								break

							default:
								strbuf += ch;
						}
						break;

					case S_COMMAND:
						switch (ch) {
							case 'i':
								// Search for the if token
								manager.jump(S_TOKEN_START, TOKEN_COND_START);
								break;

							case 'e':
								manager.jump(S_TOKEN_START, TOKEN_COND_END);
								break;

							case '{':
								manager.jump(S_CMD_VAR_REFERENCE);
								break;

							default:
								throw 'Invalid command character "' + ch + '"';
						}
						break;

					case S_TOKEN_START:
						// Skip leading whitespace
						if (this.is_whitespace(ch)) {
							break;
						}

						// Ready the token
						manager.token.reset();

						// Fallthrough to the next state
						manager.jump(S_TOKEN_MATCHING);

					case S_TOKEN_MATCHING:
						manager.token.next(manager, ch);
						break;

					case S_CMD_COND_STATEMENT:
						switch (ch) {
							case '(':
								depth += 1;
								strbuf += ch;
								break;

							case ')':
								depth -= 1;

								if (depth >= 0) {
									strbuf += ch;
								} else {
									var condition_node = new TemplateNode('condition', strbuf);
									strbuf = '';

									// Add this new condition as a child
									manager.node.add(condition_node);

									// Descend into this conditional scope
									manager.node = condition_node;

									// Set our state to load the content of this new node
									manager.jump(S_STRDATA);
								}
								break;

							default:
								strbuf += ch;
						}
						break;

					case S_CMD_VAR_REFERENCE:
						switch (ch) {
							case '}':
								manager.node.add(new TemplateNode('var', strbuf));
								strbuf = '';

								manager.jump(S_STRDATA);
								break;

							default:
								strbuf += ch;
						}
						break;
				}
			}

			if (manager.state == S_STRDATA) {
				if (strbuf.length > 0) {
					// Push a new string node if we're the last strdata element
					manager.node.add(new TemplateNode('string', strbuf));
				}
			} else {
				throw 'Bad ending state: ' + manager.state;
			}

			return tdoc;
		};
	}

    System.extend('Templating', new TemplateManager());
})();
