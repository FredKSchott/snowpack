import Component from '../../Component';
import { Scope } from '../../utils/scope';
import Wrapper from '../../render_dom/wrappers/shared/Wrapper';
import TemplateScope from './TemplateScope';
import Block from '../../render_dom/Block';
import { Node, FunctionExpression, Identifier } from 'estree';
import { TemplateNode } from '../../../interfaces';
declare type Owner = Wrapper | TemplateNode;
export default class Expression {
    type: 'Expression';
    component: Component;
    owner: Owner;
    node: any;
    references: Set<string>;
    dependencies: Set<string>;
    contextual_dependencies: Set<string>;
    template_scope: TemplateScope;
    scope: Scope;
    scope_map: WeakMap<Node, Scope>;
    declarations: Array<(Node | Node[])>;
    uses_context: boolean;
    manipulated: Node;
    constructor(component: Component, owner: Owner, template_scope: TemplateScope, info: any, lazy?: boolean);
    dynamic_dependencies(): string[];
    manipulate(block?: Block): Identifier | import("estree").SimpleLiteral | import("estree").RegExpLiteral | import("estree").Program | import("estree").FunctionDeclaration | FunctionExpression | import("estree").ArrowFunctionExpression | import("estree").SwitchCase | import("estree").CatchClause | import("estree").VariableDeclarator | import("estree").ExpressionStatement | import("estree").BlockStatement | import("estree").EmptyStatement | import("estree").DebuggerStatement | import("estree").WithStatement | import("estree").ReturnStatement | import("estree").LabeledStatement | import("estree").BreakStatement | import("estree").ContinueStatement | import("estree").IfStatement | import("estree").SwitchStatement | import("estree").ThrowStatement | import("estree").TryStatement | import("estree").WhileStatement | import("estree").DoWhileStatement | import("estree").ForStatement | import("estree").ForInStatement | import("estree").ForOfStatement | import("estree").VariableDeclaration | import("estree").ClassDeclaration | import("estree").ThisExpression | import("estree").ArrayExpression | import("estree").ObjectExpression | import("estree").YieldExpression | import("estree").UnaryExpression | import("estree").UpdateExpression | import("estree").BinaryExpression | import("estree").AssignmentExpression | import("estree").LogicalExpression | import("estree").MemberExpression | import("estree").ConditionalExpression | import("estree").SimpleCallExpression | import("estree").NewExpression | import("estree").SequenceExpression | import("estree").TemplateLiteral | import("estree").TaggedTemplateExpression | import("estree").ClassExpression | import("estree").MetaProperty | import("estree").AwaitExpression | import("estree").Property | import("estree").Super | import("estree").TemplateElement | import("estree").SpreadElement | import("estree").ObjectPattern | import("estree").ArrayPattern | import("estree").RestElement | import("estree").AssignmentPattern | import("estree").ClassBody | import("estree").MethodDefinition | import("estree").ImportDeclaration | import("estree").ExportNamedDeclaration | import("estree").ExportDefaultDeclaration | import("estree").ExportAllDeclaration | import("estree").ImportSpecifier | import("estree").ImportDefaultSpecifier | import("estree").ImportNamespaceSpecifier | import("estree").ExportSpecifier;
}
export {};
