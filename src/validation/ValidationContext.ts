import { ObjMap } from '../jsutils/ObjMap';

import { GraphQLError } from '../error/GraphQLError';

import { ASTVisitor } from '../language/visitor';
import {
  DocumentNode,
  OperationDefinitionNode,
  VariableNode,
  SelectionSetNode,
  FragmentSpreadNode,
  FragmentDefinitionNode,
} from '../language/ast';

import { Kind } from '../language/kinds';
import { visit } from '../language/visitor';

import { GraphQLSchema } from '../type/schema';
import { GraphQLDirective } from '../type/directives';
import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLCompositeType,
  GraphQLField,
  GraphQLArgument,
  GraphQLEnumValue,
} from '../type/definition';

import { TypeInfo, visitWithTypeInfo } from '../utilities/TypeInfo';

type NodeWithSelectionSet = OperationDefinitionNode | FragmentDefinitionNode;
type VariableUsage = {
  readonly node: VariableNode;
  readonly type: GraphQLInputType | null | undefined;
  readonly defaultValue: unknown | null | undefined;
};

/**
 * An instance of this class is passed as the "this" context to all validators,
 * allowing access to commonly useful contextual information from within a
 * validation rule.
 */
export class ASTValidationContext {
  _ast: DocumentNode;
  _onError: (err: GraphQLError) => void;
  _fragments: ObjMap<FragmentDefinitionNode> | null | undefined;
  _fragmentSpreads: Map<SelectionSetNode, ReadonlyArray<FragmentSpreadNode>>;
  _recursivelyReferencedFragments: Map<
    OperationDefinitionNode,
    ReadonlyArray<FragmentDefinitionNode>
  >;

  constructor(ast: DocumentNode, onError: (err: GraphQLError) => void): void {
    this._ast = ast;
    this._fragments = undefined;
    this._fragmentSpreads = new Map();
    this._recursivelyReferencedFragments = new Map();
    this._onError = onError;
  }

  reportError(error: GraphQLError): void {
    this._onError(error);
  }

  getDocument(): DocumentNode {
    return this._ast;
  }

  getFragment(name: string): FragmentDefinitionNode | null | undefined {
    let fragments = this._fragments;
    if (!fragments) {
      this._fragments = fragments = this.getDocument().definitions.reduce(
        (frags, statement) => {
          if (statement.kind === Kind.FRAGMENT_DEFINITION) {
            frags[statement.name.value] = statement;
          }
          return frags;
        },
        Object.create(null),
      );
    }
    return fragments[name];
  }

  getFragmentSpreads(
    node: SelectionSetNode,
  ): ReadonlyArray<FragmentSpreadNode> {
    let spreads = this._fragmentSpreads.get(node);
    if (!spreads) {
      spreads = [];
      const setsToVisit: Array<SelectionSetNode> = [node];
      while (setsToVisit.length !== 0) {
        const set = setsToVisit.pop();
        for (const selection of set.selections) {
          if (selection.kind === Kind.FRAGMENT_SPREAD) {
            spreads.push(selection);
          } else if (selection.selectionSet) {
            setsToVisit.push(selection.selectionSet);
          }
        }
      }
      this._fragmentSpreads.set(node, spreads);
    }
    return spreads;
  }

  getRecursivelyReferencedFragments(
    operation: OperationDefinitionNode,
  ): ReadonlyArray<FragmentDefinitionNode> {
    let fragments = this._recursivelyReferencedFragments.get(operation);
    if (!fragments) {
      fragments = [];
      const collectedNames = Object.create(null);
      const nodesToVisit: Array<SelectionSetNode> = [operation.selectionSet];
      while (nodesToVisit.length !== 0) {
        const node = nodesToVisit.pop();
        for (const spread of this.getFragmentSpreads(node)) {
          const fragName = spread.name.value;
          if (collectedNames[fragName] !== true) {
            collectedNames[fragName] = true;
            const fragment = this.getFragment(fragName);
            if (fragment) {
              fragments.push(fragment);
              nodesToVisit.push(fragment.selectionSet);
            }
          }
        }
      }
      this._recursivelyReferencedFragments.set(operation, fragments);
    }
    return fragments;
  }
}

export type ASTValidationRule = (arg0: ASTValidationContext) => ASTVisitor;

export class SDLValidationContext extends ASTValidationContext {
  _schema: GraphQLSchema | null | undefined;

  constructor(
    ast: DocumentNode,
    schema: GraphQLSchema | null | undefined,
    onError: (err: GraphQLError) => void,
  ): void {
    super(ast, onError);
    this._schema = schema;
  }

  getSchema(): GraphQLSchema | null | undefined {
    return this._schema;
  }
}

export type SDLValidationRule = (arg0: SDLValidationContext) => ASTVisitor;

export class ValidationContext extends ASTValidationContext {
  _schema: GraphQLSchema;
  _typeInfo: TypeInfo;
  _variableUsages: Map<NodeWithSelectionSet, ReadonlyArray<VariableUsage>>;
  _recursiveVariableUsages: Map<
    OperationDefinitionNode,
    ReadonlyArray<VariableUsage>
  >;

  constructor(
    schema: GraphQLSchema,
    ast: DocumentNode,
    typeInfo: TypeInfo,
    onError: (err: GraphQLError) => void,
  ): void {
    super(ast, onError);
    this._schema = schema;
    this._typeInfo = typeInfo;
    this._variableUsages = new Map();
    this._recursiveVariableUsages = new Map();
  }

  getSchema(): GraphQLSchema {
    return this._schema;
  }

  getVariableUsages(node: NodeWithSelectionSet): ReadonlyArray<VariableUsage> {
    let usages = this._variableUsages.get(node);
    if (!usages) {
      const newUsages = [];
      const typeInfo = new TypeInfo(this._schema);
      visit(
        node,
        visitWithTypeInfo(typeInfo, {
          VariableDefinition: () => false,
          Variable(variable) {
            newUsages.push({
              node: variable,
              type: typeInfo.getInputType(),
              defaultValue: typeInfo.getDefaultValue(),
            });
          },
        }),
      );
      usages = newUsages;
      this._variableUsages.set(node, usages);
    }
    return usages;
  }

  getRecursiveVariableUsages(
    operation: OperationDefinitionNode,
  ): ReadonlyArray<VariableUsage> {
    let usages = this._recursiveVariableUsages.get(operation);
    if (!usages) {
      usages = this.getVariableUsages(operation);
      for (const frag of this.getRecursivelyReferencedFragments(operation)) {
        usages = usages.concat(this.getVariableUsages(frag));
      }
      this._recursiveVariableUsages.set(operation, usages);
    }
    return usages;
  }

  getType(): GraphQLOutputType | null | undefined {
    return this._typeInfo.getType();
  }

  getParentType(): GraphQLCompositeType | null | undefined {
    return this._typeInfo.getParentType();
  }

  getInputType(): GraphQLInputType | null | undefined {
    return this._typeInfo.getInputType();
  }

  getParentInputType(): GraphQLInputType | null | undefined {
    return this._typeInfo.getParentInputType();
  }

  getFieldDef(): GraphQLField<unknown, unknown> | null | undefined {
    return this._typeInfo.getFieldDef();
  }

  getDirective(): GraphQLDirective | null | undefined {
    return this._typeInfo.getDirective();
  }

  getArgument(): GraphQLArgument | null | undefined {
    return this._typeInfo.getArgument();
  }

  getEnumValue(): GraphQLEnumValue | null | undefined {
    return this._typeInfo.getEnumValue();
  }
}

export type ValidationRule = (arg0: ValidationContext) => ASTVisitor;
