#!/usr/bin/env python3
"""
Marcenaria-PRO - Programa de Gestão
Sistema de variação de módulos e orçamento para marcenaria
"""

import json
import os
from datetime import datetime


class Module:
    """Representa um módulo de marcenaria"""
    
    def __init__(self, name, base_cost, variation=0):
        self.name = name
        self.base_cost = base_cost
        self.variation = variation
        self.total_cost = base_cost + variation
    
    def __str__(self):
        return f"{self.name} - R$ {self.total_cost:.2f}"
    
    def to_dict(self):
        return {
            'name': self.name,
            'base_cost': self.base_cost,
            'variation': self.variation,
            'total_cost': self.total_cost
        }


class Budget:
    """Gerencia o orçamento de módulos"""
    
    def __init__(self):
        self.modules = []
        self.created_at = datetime.now()
    
    def add_module(self, module):
        """Adiciona um módulo ao orçamento"""
        self.modules.append(module)
    
    def remove_module(self, index):
        """Remove um módulo do orçamento"""
        if 0 <= index < len(self.modules):
            removed = self.modules.pop(index)
            return removed
        return None
    
    def get_total(self):
        """Calcula o custo total do orçamento"""
        return sum(module.total_cost for module in self.modules)
    
    def get_module_count(self):
        """Retorna o número de módulos"""
        return len(self.modules)
    
    def display(self):
        """Exibe o orçamento completo"""
        print("\n" + "="*60)
        print("           ORÇAMENTO MARCENARIA-PRO")
        print("="*60)
        
        if not self.modules:
            print("\nNenhum módulo adicionado ainda.")
        else:
            print("\nMÓDULOS:")
            for i, module in enumerate(self.modules, 1):
                print(f"  {i}. {module}")
        
        print("\n" + "-"*60)
        print(f"Total de Módulos: {self.get_module_count()}")
        print(f"Custo Total: R$ {self.get_total():.2f}")
        print("="*60 + "\n")
    
    def save_to_file(self, filename="orcamento.json"):
        """Salva o orçamento em um arquivo JSON"""
        data = {
            'created_at': self.created_at.isoformat(),
            'modules': [module.to_dict() for module in self.modules],
            'total': self.get_total()
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Orçamento salvo em {filename}")


class ModuleFactory:
    """Fábrica de módulos pré-definidos"""
    
    TEMPLATES = {
        '1': {'name': 'Armário de Cozinha', 'base_cost': 1500},
        '2': {'name': 'Guarda-Roupa', 'base_cost': 2500},
        '3': {'name': 'Estante', 'base_cost': 1200},
        '4': {'name': 'Mesa de Jantar', 'base_cost': 800},
        '5': {'name': 'Rack TV', 'base_cost': 600},
        '6': {'name': 'Balcão', 'base_cost': 900},
        '7': {'name': 'Cama Box', 'base_cost': 1800},
        '8': {'name': 'Escrivaninha', 'base_cost': 700}
    }
    
    @classmethod
    def create_module(cls, template_id, variation=0):
        """Cria um módulo baseado em um template"""
        if template_id in cls.TEMPLATES:
            template = cls.TEMPLATES[template_id]
            return Module(template['name'], template['base_cost'], variation)
        return None
    
    @classmethod
    def list_templates(cls):
        """Lista todos os templates disponíveis"""
        print("\nMÓDULOS DISPONÍVEIS:")
        for key, template in cls.TEMPLATES.items():
            print(f"  {key}. {template['name']} - R$ {template['base_cost']:.2f} (base)")


def main():
    """Função principal do programa"""
    budget = Budget()
    
    print("="*60)
    print("        BEM-VINDO AO MARCENARIA-PRO")
    print("   Sistema de Variação de Módulos e Orçamento")
    print("="*60)
    
    while True:
        print("\nOPÇÕES:")
        print("  1. Adicionar módulo")
        print("  2. Remover módulo")
        print("  3. Ver orçamento")
        print("  4. Salvar orçamento")
        print("  5. Sair")
        
        choice = input("\nEscolha uma opção: ").strip()
        
        if choice == '1':
            ModuleFactory.list_templates()
            template_id = input("\nEscolha o módulo (número): ").strip()
            
            try:
                variation_input = input("Digite a variação de preço (ou Enter para 0): ").strip()
                variation = float(variation_input) if variation_input else 0
                
                module = ModuleFactory.create_module(template_id, variation)
                if module:
                    budget.add_module(module)
                    print(f"\n✓ Módulo '{module.name}' adicionado com sucesso!")
                else:
                    print("\n✗ Módulo inválido!")
            except ValueError:
                print("\n✗ Valor de variação inválido!")
        
        elif choice == '2':
            if budget.get_module_count() == 0:
                print("\nNenhum módulo para remover!")
            else:
                budget.display()
                try:
                    index = int(input("Digite o número do módulo para remover: ")) - 1
                    removed = budget.remove_module(index)
                    if removed:
                        print(f"\n✓ Módulo '{removed.name}' removido com sucesso!")
                    else:
                        print("\n✗ Número inválido!")
                except ValueError:
                    print("\n✗ Entrada inválida!")
        
        elif choice == '3':
            budget.display()
        
        elif choice == '4':
            filename = input("Nome do arquivo (Enter para 'orcamento.json'): ").strip()
            if not filename:
                filename = 'orcamento.json'
            budget.save_to_file(filename)
        
        elif choice == '5':
            print("\nObrigado por usar o Marcenaria-PRO!")
            print("Até logo! 🪚\n")
            break
        
        else:
            print("\n✗ Opção inválida!")


if __name__ == "__main__":
    main()
