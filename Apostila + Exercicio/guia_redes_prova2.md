# GUIA COMPLETO DE ESTUDOS — REDES DE COMPUTADORES
## Prova 2 | 20 de outubro de 2026

**Conteúdos:** IPv4 e classes; subnetting, VLSM e CIDR; introdução ao IPv6; comutação Ethernet, aprendizagem de MAC e STP; VLANs, 802.1Q, trunking e roteamento Inter-VLAN.

**Como usar:** leia um tópico, feche a explicação e tente explicar em voz alta; resolva os exemplos com papel; termine com o simulado sem olhar o gabarito. A seção “Atenção às fontes” separa complementos e correções técnicas dos documentos recebidos.

## 1. O panorama: como uma mensagem percorre a rede

Imagine que o PC A precise acessar um servidor. O aplicativo gera dados; TCP ou UDP cuida do transporte; IP escolhe os endereços lógicos e o encaminhamento entre redes; Ethernet transporta quadros entre vizinhos físicos. Um switch Ethernet de camada 2 encaminha **quadros** com base no MAC; um roteador (ou switch de camada 3) encaminha **pacotes IP** entre redes. Essa distinção resolve muitas questões.

| Pergunta | Resposta curta |
|---|---|
| Quem identifica a interface na LAN? | Endereço MAC |
| Quem identifica origem e destino lógico? | Endereço IP |
| Quem aprende endereços MAC de origem? | Switch |
| Quem conecta sub-redes IP diferentes? | Roteador ou switch L3 |
| Quem divide um domínio de broadcast Ethernet? | VLANs ou roteadores |
| Quem evita loops na topologia L2? | STP/RSTP |

**Experimento mental:** dois PCs na mesma VLAN e mesma sub-rede se comunicam pelo switch sem roteador. Se um PC está na VLAN 10 e outro na VLAN 20, será necessário roteamento Inter-VLAN, mesmo que estejam no mesmo switch físico.

## 2. IPv4: o que significa um endereço

IPv4 possui **32 bits**, agrupados em 4 octetos de 8 bits (de 0 a 255). Exemplo: `192.168.10.34`. Cada octeto pode ser pensado como a soma de `128 64 32 16 8 4 2 1`. Por exemplo, `192 = 128 + 64`, ou `11000000` em binário.

A máscara separa os bits de **rede** (1 na máscara) dos bits de **host** (0 na máscara). `/24` significa 24 bits de rede e 8 bits de host, isto é, `255.255.255.0`.

**Atenção:** a classificação A/B/C é um tema histórico cobrado nos materiais. Redes modernas utilizam CIDR, de modo que a classe não determina a máscara efetiva de um endereço.

| Classe histórica | Primeiro octeto | Máscara padrão | Prefixo |
|---|---|---|---|
| A | 1–126 (127 reservado para loopback) | 255.0.0.0 | /8 |
| B | 128–191 | 255.255.0.0 | /16 |
| C | 192–223 | 255.255.255.0 | /24 |
| D | 224–239 | Multicast | — |
| E | 240–255 | Reservado/experimental | — |

**Endereços privados (RFC 1918):** `10.0.0.0/8`, `172.16.0.0/12` (até 172.31.255.255) e `192.168.0.0/16`. Não são roteados diretamente na Internet pública. `127.0.0.0/8` é reservado para loopback, sendo `127.0.0.1` o exemplo mais conhecido.

### Rede, hosts e broadcast

Para `192.168.10.34/24`:

- Rede: `192.168.10.0` (todos os bits de host = 0).
- Hosts utilizáveis: `192.168.10.1` a `192.168.10.254`.
- Broadcast: `192.168.10.255` (todos os bits de host = 1).
- Total de endereços: `2^(32−24)=256`.
- Hosts utilizáveis em uma sub-rede convencional: `256−2=254`.

**Regra central:** `endereços = 2^(32−prefixo)` e `hosts = 2^(32−prefixo)−2`. A subtração de 2 vale para redes IPv4 convencionais; `/31` tem uso especial em enlaces ponto a ponto e `/32` representa um único endereço.

### Tabela para memorizar

| CIDR | Máscara | Bloco de endereços | Hosts utilizáveis |
|---|---|---:|---:|
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /28 | 255.255.255.240 | 16 | 14 |
| /29 | 255.255.255.248 | 8 | 6 |
| /30 | 255.255.255.252 | 4 | 2 |
| /23 | 255.255.254.0 | 512 | 510 |
| /22 | 255.255.252.0 | 1024 | 1022 |
| /20 | 255.255.240.0 | 4096 | 4094 |

**Memória rápida:** a cada +1 no prefixo, o tamanho do bloco cai pela metade. `/24 -> /25 -> /26 -> /27` significa `256 -> 128 -> 64 -> 32` endereços.

## 3. Subnetting: descobrir rede e broadcast sem converter tudo para binário

**Método do salto:** (1) identifique o octeto onde a máscara deixa de ser 255 e ainda não é zero; (2) faça `256 − valor desse octeto`; (3) os inícios dos blocos são múltiplos desse salto; (4) encontre o bloco que contém o IP; (5) broadcast é um endereço antes do próximo bloco.

### Exemplo 1 — `192.168.30.100/27`

`/27 = 255.255.255.224`. Salto: `256 − 224 = 32`. Blocos do último octeto: `0–31`, `32–63`, `64–95`, `96–127`, `128–159`, `160–191`, `192–223`, `224–255`.

O IP terminado em **100** está no bloco `96–127`. Logo:

- Rede: `192.168.30.96/27`.
- Primeiro host: `192.168.30.97`.
- Último host: `192.168.30.126`.
- Broadcast: `192.168.30.127`.
- Hosts utilizáveis: `30`.

### Exemplo 2 — `172.16.150.1/22`

`/22 = 255.255.252.0`: o octeto de interesse é o **terceiro**. Salto: `256 − 252 = 4`. Terceiros octetos possíveis de início: `0, 4, 8, ..., 148, 152, ...`. Como `150` está entre `148` e `151`, a rede é `172.16.148.0/22` e o broadcast `172.16.151.255`. Primeiro host `172.16.148.1`, último `172.16.151.254`.

### Exemplo 3 — `192.168.22.0/24` dividido em oito partes iguais

São necessários **3 bits emprestados**, pois `2³ = 8`. Novo prefixo: `/27`. Salto 32. A **terceira sub-rede** (contando a primeira como número 1) é `192.168.22.64/27`: hosts `.65` até `.94` e broadcast `.95`.

### Exemplo 4 — encontrar a máscara mínima

Precisamos de **60 hosts**. Experimente `2^h−2 ≥ 60`. Com `h=5`, 30 hosts (não basta). Com `h=6`, 62 hosts (basta). Portanto: `32−6 = /26`, máscara `255.255.255.192`. **Erro comum:** escolher `/27` porque “parece mais próximo”.

## 4. VLSM: redes de tamanhos diferentes

**VLSM (Variable Length Subnet Mask)** permite subdividir um bloco inicial em sub-redes de prefixos distintos, economizando endereços. Primeiro ordene as demandas da **maior para a menor**; em seguida, escolha a menor potência de dois capaz de comportar hosts mais rede e broadcast; por fim, aloque cada bloco na próxima fronteira válida.

### Exemplo completo baseado na lista do professor

Bloco de origem: `192.168.50.0/24`. Necessidades: A=50, B=20, C=10, D=5, E=2, F=2 hosts utilizáveis. Ordem já está decrescente.

| Sub-rede | Demanda | CIDR | Rede | Hosts válidos | Broadcast |
|---|---:|---|---|---|---|
| A | 50 | /26 | 192.168.50.0 | .1–.62 | .63 |
| B | 20 | /27 | 192.168.50.64 | .65–.94 | .95 |
| C | 10 | /28 | 192.168.50.96 | .97–.110 | .111 |
| D | 5 | /29 | 192.168.50.112 | .113–.118 | .119 |
| E | 2 | /30 | 192.168.50.120 | .121–.122 | .123 |
| F | 2 | /30 | 192.168.50.124 | .125–.126 | .127 |

O último IP utilizável da A, que pode ser definido como gateway, é **192.168.50.62**.

Endereços utilizáveis mas não requeridos em A, B e C: A tem 62−50 = 12; B tem 30−20 = 10; C tem 14−10 = 4. Soma = **26 hosts disponíveis não utilizados**. Se o enunciado pedir “endereços totais não usados”, a interpretação muda: esclareça se rede/broadcast entram na contagem.

**Cuidado com alinhamento:** `192.168.1.32/26` **não é um endereço de rede válido** de /26. Os blocos /26 começam em `.0`, `.64`, `.128`, `.192`. `192.168.1.32` pertence à rede `192.168.1.0/26`, que se sobrepõe à rede `192.168.1.0/27` já alocada. A próxima /26 não sobreposta seria `192.168.1.64/26`.

## 5. CIDR e super-redes

**CIDR (Classless Inter-Domain Routing)** representa prefixos sem depender da classe histórica. A notação `192.168.50.0/26` informa que 26 bits identificam a rede. Também permite **agregação/sumarização** de rotas quando blocos são contíguos e corretamente alinhados.

Exemplo: `192.168.32.0/24` e `192.168.33.0/24` podem formar `192.168.32.0/23`, com máscara `255.255.254.0` e `510` hosts utilizáveis em uma única sub-rede convencional.

**Não confunda VLSM com CIDR:** VLSM é o emprego de tamanhos diferentes de sub-redes dentro de um plano de endereçamento; CIDR é a forma classless de representar e rotear prefixos, também usada para sumarizar blocos.

## 6. IPv6: estrutura e diferenças em relação ao IPv4

**Complemento didático:** os PDFs fornecidos não incluem uma apresentação dedicada à introdução ao IPv6; esta seção cobre os conceitos introdutórios usuais e deve ser validada contra anotações da aula de 29/09.

IPv6 usa **128 bits**, escritos em **oito grupos hexadecimais de 16 bits**. Exemplo: `2001:0db8:0000:0000:0000:0000:0000:0001`. Cada dígito hexadecimal corresponde a quatro bits (`A=10`, `F=15`).

Regras de abreviação: (1) retire zeros à esquerda em qualquer grupo; (2) substitua **uma única sequência contínua** de grupos inteiramente zerados por `::`. O endereço acima vira `2001:db8::1`. O `::` só pode aparecer uma vez, porque duas ocorrências tornariam ambígua a quantidade de grupos omitidos.

| Conceito | IPv4 | IPv6 |
|---|---|---|
| Tamanho | 32 bits | 128 bits |
| Representação | Decimal pontuado | Hexadecimal com `:` |
| Broadcast | Existe | Não existe; usa multicast/anycast conforme o caso |
| Descoberta de vizinhos | ARP | NDP (ICMPv6) |
| Configuração automática | DHCPv4, configuração manual | SLAAC, DHCPv6, configuração manual |
| Máscara usual | 255.255.255.0, /24 etc. | Prefixo, p.ex. /64 |
| NAT | Muito comum em redes privadas | Não é requisito da arquitetura |

**Tipos de endereço:** global unicast (`2000::/3`, em termos gerais), link-local (`fe80::/10`, válido no enlace local), unique local (`fc00::/7`, uso interno), multicast (`ff00::/8`) e loopback (`::1/128`). `::/128` é endereço não especificado. `2001:db8::/32` é reservado para documentação e exemplos.

**Exemplo de /64:** `2001:db8:abcd:10::/64` possui 64 bits de prefixo e 64 bits de identificador de interface. **Não aplique a fórmula “−2 hosts” do IPv4 a uma sub-rede IPv6.**

**NDP:** Neighbor Discovery usa mensagens ICMPv6, incluindo Neighbor Solicitation/Advertisement e Router Solicitation/Advertisement, substituindo funções de ARP e ajudando na descoberta de roteadores e na autoconfiguração.

**Questão típica:** `2001:0DB8:0000:0000:00A0:0000:0000:0007` pode ser abreviado como `2001:db8::a0:0:0:7` (a primeira sequência com dois grupos zero foi comprimida). Não se pode escrever dois `::`.

## 7. Comutação: circuitos, mensagens, pacotes e células

O material de **Comutação** apresenta quatro modelos. Memorize o contraste fundamental entre *reservar caminho* e *compartilhar recursos*.

| Tipo | Funcionamento | Vantagem principal | Limitação/Exemplo |
|---|---|---|---|
| Circuitos | Estabelece circuito dedicado antes da transmissão | Recursos previsíveis | Desperdício quando o circuito fica ocioso; telefonia clássica |
| Mensagens | Nó recebe/guarda a mensagem inteira antes de encaminhar | Flexibilidade do armazenamento | Atraso elevado para mensagens grandes; telex histórico |
| Pacotes | Divide dados em unidades encaminhadas pela rede | Compartilhamento eficiente | Filas, congestionamento e variação de atraso; Internet |
| Células | Unidades de tamanho fixo (ATM) | Encaminhamento previsível | Overhead e complexidade; tecnologia histórica |

Na comutação de circuitos, **FDM** separa por faixas de frequência, e **TDM** divide o tempo em slots. Na comutação por pacotes, filas nos roteadores podem provocar atraso e perda. O modelo de datagramas permite que pacotes distintos sigam rotas distintas; circuitos virtuais usam estado/caminho previamente estabelecido.

## 8. Ethernet: quadros, MAC, colisão e broadcast

**Switch L2:** ao receber um quadro, aprende o **MAC de origem** e associa esse MAC à porta de entrada (e à VLAN). Em seguida consulta o MAC de destino: se conhecido, encaminha na porta correspondente; se desconhecido, faz *flooding* na VLAN, exceto pela porta de origem. Broadcast também é replicado às portas pertinentes da mesma VLAN.

### Exemplo de tabela MAC

| MAC aprendido | Porta | VLAN |
|---|---|---|
| AA:AA:AA:AA:AA:01 | F0/1 | 10 |
| BB:BB:BB:BB:BB:02 | F0/2 | 10 |

1. A envia um quadro destinado a B: switch aprende A/F0/1; se B ainda não existe na tabela, faz flooding na VLAN 10.
2. B responde: switch aprende B/F0/2 e já sabe encaminhar para A na F0/1.
3. Nas próximas transmissões, encaminha unicast somente para a porta conhecida.

**Hub x switch x roteador:** um hub repete bits e mantém um mesmo domínio de colisão; em switch Ethernet full-duplex, cada porta é um domínio de colisão separado (colisões não ocorrem no enlace full-duplex); roteadores separam domínios de broadcast. VLANs também estabelecem domínios de broadcast distintos dentro da infraestrutura L2.

**Domínio de colisão** é onde transmissões simultâneas podem colidir em meios compartilhados/half-duplex. **Domínio de broadcast** é o alcance do tráfego de broadcast de camada 2. Não confunda ambos.

**Latência** é o atraso entre origem e destino, incluindo propagação, transmissão, filas e processamento.

## 9. Spanning Tree Protocol (STP): evitando loops

Redundância é boa para disponibilidade, mas conexões L2 redundantes podem gerar **loops**, tempestades de broadcast e instabilidade da tabela MAC. O STP forma uma **árvore lógica sem ciclos**, mantendo enlaces físicos redundantes prontos para assumir em caso de falha.

### Passo 1 — eleger o Root Bridge

Cada switch anuncia informações em **BPDUs**. O switch com a **menor Bridge ID (BID)** vence. BID depende da prioridade configurada, extensão do identificador de sistema/VLAN (nos modos per-VLAN) e MAC. Na prática: compare primeiro prioridade efetiva; em empate, menor MAC. Prioridade base costuma ser configurada em múltiplos de 4096.

### Passo 2 — selecionar Root Ports

Em cada switch **não-root**, uma porta é escolhida como **Root Port (RP)**: melhor caminho para chegar ao Root Bridge segundo o custo acumulado STP. Empates seguem critérios de IDs de bridges/portas. O Root Bridge não tem Root Port.

### Passo 3 — selecionar Designated Ports

Para cada segmento, existe uma **Designated Port (DP)**, isto é, a porta que oferece o melhor caminho em direção à raiz. As portas do Root Bridge nos enlaces normais são designadas. Portas redundantes que não foram escolhidas para encaminhar ficam em estado de bloqueio/descartando conforme a variante.

### Estados e versões

| STP clássico (802.1D) | Encaminha dados? | Aprende MAC? |
|---|---|---|
| Blocking | Não | Não |
| Listening | Não | Não |
| Learning | Não | Sim |
| Forwarding | Sim | Sim |
| Disabled | Não | Não |

**RSTP (802.1w)** simplifica para **Discarding, Learning e Forwarding**, convergindo mais rapidamente. É correto distinguir o **papel** da porta (root/designated/alternate) de seu **estado** (forwarding/discarding/learning).

### Exercício mental com 3 switches

S1, S2 e S3 formam um triângulo. S1 tem a menor prioridade, então é Root. Os enlaces de S2 e S3 diretamente para S1 são seus caminhos de menor custo (RPs). No enlace entre S2 e S3, uma porta será DP e a outra não encaminhará tráfego, prevenindo o loop. Se S1–S2 cair, o STP pode reconvergir usando o enlace S2–S3.

**Comandos úteis:** `show spanning-tree`, `show spanning-tree vlan 10`, `spanning-tree vlan 10 priority 4096` (ajuste conforme projeto), `spanning-tree vlan 10 root primary` (em plataformas que suportam) e `show interfaces status`. No laboratório, compare a eleição antes e depois da mudança de prioridade e da queda de um uplink.

## 10. VLAN: várias redes lógicas na mesma infraestrutura

**VLAN (Virtual LAN)** separa logicamente domínios de broadcast em um switch. PC da VLAN 10 e PC da VLAN 20 não se comunicam diretamente em camada 2. Para transitar entre VLANs normalmente é necessário roteamento de camada 3.

**Porta access:** usada em geral para dispositivos finais; participa de uma VLAN de dados, e quadros comuns do host chegam sem tag 802.1Q. **Porta trunk:** transporta tráfego de múltiplas VLANs entre switches ou entre switch e roteador/switch L3, mantendo a identidade de cada VLAN.

### O que 802.1Q acrescenta

Inserção de uma tag de **4 bytes** no quadro Ethernet, composta de **TPID 16 bits** (normalmente `0x8100`) e **TCI 16 bits**: PCP (3 bits, prioridade/QoS), DEI (1 bit, elegibilidade ao descarte) e VID (12 bits, identificador VLAN). São **4096 valores possíveis de VID**, mas **0 e 4095 são reservados**, restando VLAN IDs **1 a 4094** (disponibilidade prática varia por plataforma). Em trunk 802.1Q, quadros da *native VLAN* normalmente trafegam sem tag, salvo configuração específica.

**O mesmo número de VLAN em dois switches não basta, por si só, para criar conectividade:** deve haver um caminho L2 que transporte aquela VLAN (por exemplo, trunk permitindo a VLAN 10), e as portas de acesso/endereçamento precisam estar corretos.

### Exemplo de configuração de dois switches Cisco

```text
Switch> enable
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name ENGENHARIA
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name FINANCEIRO
Switch(config-vlan)# exit
Switch(config)# interface fastEthernet 0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit
Switch(config)# interface fastEthernet 0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20
Switch(config-if)# end
Switch# show vlan brief
Switch# show interfaces trunk
Switch# copy running-config startup-config
```

Faça o mesmo no segundo switch, ajustando a porta do PC e mantendo o trunk entre as portas conectadas. `show vlan brief` verifica VLANs/portas access; `show interfaces trunk` verifica troncos. Os comandos exatos podem variar conforme o IOS e o equipamento, como ressalta o laboratório Cisco.

### VTP, DTP e VLAN hopping

- **VTP** é um protocolo Cisco para propagação/gerenciamento de informações de VLANs em um domínio; atenção a número de revisão e modos de operação.
- **DTP** é o mecanismo Cisco de negociação dinâmica do tipo de porta/trunk. Para evitar trunking inesperado, configurar explicitamente o modo apropriado e usar `switchport nonegotiate` quando suportado e adequado.
- **VLAN hopping** explora configurações indevidas, como negociações de trunk ou double tagging. Boas práticas incluem não confiar em trunk dinâmico nas portas de usuários, restringir VLANs permitidas e planejar corretamente a native VLAN.

### Arquitetura hierárquica

Camada de **acesso** conecta usuários e equipamentos; **distribuição** reúne switches de acesso e aplica políticas/roteamento; **core** é o backbone de alta velocidade e alta disponibilidade. Em redes pequenas, distribuição e core podem ser combinadas.

## 11. Inter-VLAN Routing: como VLAN 10 conversa com VLAN 20

Considere VLAN 10 = `192.168.10.0/24` e VLAN 20 = `192.168.20.0/24`. Cada uma possui um gateway, que precisa operar em camada 3. Há duas soluções clássicas:

**A. Router-on-a-stick:** um enlace trunk liga o switch ao roteador; cada VLAN ganha uma **subinterface** no roteador, com encapsulamento 802.1Q.

```text
Router> enable
Router# configure terminal
Router(config)# interface gigabitEthernet 0/0
Router(config-if)# no shutdown
Router(config-if)# exit
Router(config)# interface gigabitEthernet 0/0.10
Router(config-subif)# encapsulation dot1Q 10
Router(config-subif)# ip address 192.168.10.1 255.255.255.0
Router(config-subif)# exit
Router(config)# interface gigabitEthernet 0/0.20
Router(config-subif)# encapsulation dot1Q 20
Router(config-subif)# ip address 192.168.20.1 255.255.255.0
Router(config-subif)# end
```

A porta do switch ligada ao roteador precisa estar em modo trunk e permitir VLANs 10 e 20. PCs da VLAN 10 utilizam gateway `192.168.10.1`; PCs da VLAN 20 usam `192.168.20.1`.

**B. Switch multicamadas:** cria-se uma **SVI** (interface VLAN) com IP de gateway por VLAN, e habilita-se `ip routing` em dispositivos que suportam roteamento L3.

```text
Switch(config)# ip routing
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.1 255.255.255.0
Switch(config-if)# no shutdown
```

**Não confunda:** uma SVI de gerenciamento em um switch L2 não transforma esse equipamento automaticamente em roteador entre VLANs.

### Sequência de diagnóstico de falhas

1. PC tem IP, prefixo/máscara e gateway corretos?
2. Porta de acesso está na VLAN correta? (`show vlan brief`)
3. VLAN existe nos switches e atravessa o trunk? (`show interfaces trunk`)
4. Roteador tem subinterfaces com `encapsulation dot1Q` correta ou switch L3 tem SVIs com `ip routing`?
5. Interfaces estão ativas? (`show ip interface brief`)
6. Teste ping primeiro para o próprio gateway, depois para host de outra VLAN.

## 12. Comandos Cisco: guia prático de prova

| Comando | Onde / finalidade |
|---|---|
| `enable` | EXEC usuário → privilegiado |
| `configure terminal` | Entrar em configuração global |
| `hostname S1` | Renomear equipamento |
| `interface f0/1` | Configurar porta/interface |
| `interface range f0/2 - 5` | Configurar várias portas |
| `shutdown` / `no shutdown` | Desativar / ativar interface |
| `show running-config` | Ver configuração ativa |
| `show ip interface brief` | Resumo de IPs e status de interfaces |
| `show mac address-table` | Ver aprendizagem MAC do switch |
| `show vlan brief` | Ver VLANs e portas access |
| `show interfaces trunk` | Ver interfaces trunk |
| `show spanning-tree` | Ver raiz, estados e papéis STP |
| `show ip route` | Ver rotas IP no roteador/L3 |
| `ping x.x.x.x` | Testar alcance |
| `copy running-config startup-config` | Salvar configuração |

Uma rota estática tem sintaxe usual `ip route DESTINO MASCARA PROXIMO_SALTO`. Exemplo: `ip route 192.168.50.0 255.255.255.0 10.0.0.2`. O material também apresenta exemplos de DHCP e roteamento RIP/OSPF/BGP, mas o recorte do cronograma enfatiza switching e inter-VLAN; revise esses comandos de outros protocolos depois dos principais, a menos que o professor os tenha incluído verbalmente.

## 13. Resolução da lista de exercícios de sub-redes do professor

**1.** Emprestando três bits, `2³=8` sub-redes. A máscara final depende do prefixo **original**. Se a rede original é `/24`, nova `/27 = 255.255.255.224`. Sem o prefixo inicial, não existe uma única nova máscara.

**2.** `/26` suporta **62 hosts**. Máscara `255.255.248.0` é `/21`, que suporta **2046 hosts**; a rede `172.16.0.0/16` está sendo subdividida em oito blocos `/21`.

**3.** Terceira sub-rede entre oito divisões de `192.168.22.0/24`: `192.168.22.64/27`; hosts `.65–.94`; broadcast `.95`.

**4.** `192.168.30.100/27` está em `192.168.30.96/27`; broadcast `192.168.30.127`.

**5.** Mínimo para 60 hosts: `/26 = 255.255.255.192`, 62 utilizáveis.

**6.** Exatamente 14 utilizáveis: `/28 = 255.255.255.240`, salto **16** no último octeto.

**7.** Dois hosts utilizáveis em sub-rede IPv4 convencional: `/30 = 255.255.255.252`. Em links ponto a ponto modernos pode-se usar `/31` (RFC 3021), mas a resposta convencional da lista é `/30`.

**8.** `172.16.150.1/22` → rede `172.16.148.0`, máscara `255.255.252.0`.

**9.** Broadcast `20.4.135.255` com `/23` → rede `20.4.134.0/23`.

**10.** `255.255.252.0` equivale a `/22`, **1022 hosts** utilizáveis.

**11–12.** A=`192.168.50.0/26`; B=`192.168.50.64/27`; C=`192.168.50.96/28`; D=`192.168.50.112/29`; E=`192.168.50.120/30`; F=`192.168.50.124/30`. Intervalos completos na seção 4.

**13.** A+B+C: **26 endereços de host utilizáveis ainda livres** (12+10+4).

**14.** Gateway sendo último host de A: `192.168.50.62`.

**18.** Para 150 hosts, `2^7−2=126` insuficiente; `2^8−2=254` suficiente → **8 bits de host**, máscara `/24`.

**19.** `192.168.1.32/26` não está alinhada a fronteira /26 e representaria na realidade `192.168.1.0/26`, sobrepondo `192.168.1.0/27`.

**20.** `192.168.32.0/24 + 192.168.33.0/24` → `192.168.32.0/23`; máscara `255.255.254.0`; **510 hosts** convencionais.

**Observação:** a numeração da lista recebida passa de 14 diretamente para 18; não há exercícios 15, 16 ou 17 no documento enviado.

## 14. Simulado final — responda antes de ler o gabarito

1. Um switch aprende o MAC de origem ou o MAC de destino ao receber um quadro?
2. Qual a diferença entre domínio de colisão e de broadcast?
3. Para `192.168.12.139/26`, informe rede, broadcast e faixa utilizável.
4. Quantos hosts convencionais cabem em `/29`?
5. Qual prefixo mínimo atende a 100 hosts utilizáveis?
6. Divida `192.168.40.0/24` em uma sub-rede para 70 hosts, outra para 25 e outra para 8, sem sobreposição.
7. Qual a diferença entre CIDR e VLSM?
8. Em IPv6, quantos bits possui o endereço? `::` pode aparecer duas vezes?
9. Para que serve o NDP no IPv6?
10. Compare comutação de circuitos e de pacotes.
11. O que acontece quando um switch recebe quadro para MAC de destino desconhecido?
12. Por que loops Ethernet são perigosos?
13. Qual switch vence a eleição do Root Bridge STP?
14. Qual a diferença entre Root Port e Designated Port?
15. Qual a diferença entre Blocking e Learning no STP clássico?
16. O que é VLAN e o que ela segmenta?
17. Para que serve o trunk 802.1Q e quantos bytes tem sua tag?
18. Qual a diferença entre uma porta access e uma trunk?
19. Um PC da VLAN 10 quer alcançar um PC da VLAN 20. O que é necessário?
20. Qual comando consulta VLANs e portas access no Cisco IOS?
21. Qual comando consulta trunks no Cisco IOS?
22. O que significa `encapsulation dot1Q 20` em uma subinterface do roteador?
23. O que pode estar errado se um host pinga outro no mesmo switch/VLAN, mas não em outro switch da mesma VLAN?
24. O que acontece se conectar dois switches por dois enlaces L2 sem STP ou outra prevenção de loop?

### Gabarito comentado do simulado

1. **Origem**; o destino serve para a decisão de encaminhamento.
2. Colisão diz respeito ao meio compartilhado/half-duplex; broadcast ao alcance de quadros destinados a todos da VLAN.
3. `/26`: blocos 0–63, 64–127, 128–191, 192–255. Rede **192.168.12.128**, broadcast **.191**, hosts **.129–.190**.
4. **6** hosts.
5. `/25`, com **126** hosts utilizáveis.
6. 70 → `192.168.40.0/25` (hosts .1–.126), 25 → `192.168.40.128/27` (.129–.158), 8 → `192.168.40.160/28` (.161–.174).
7. CIDR é notação/roteamento classless; VLSM usa prefixos de vários tamanhos no plano de sub-redes.
8. **128** bits; `::` pode aparecer **uma** vez.
9. Descoberta de vizinhos, roteadores, resolução de endereços de enlace e suporte à autoconfiguração via ICMPv6.
10. Circuitos reservam recursos/caminho; pacotes compartilham recursos e podem sofrer filas e atraso variável.
11. **Flooding dentro da VLAN** (exceto interface de entrada), sujeito a regras do switch.
12. Tempestade de broadcast, duplicações e instabilidade da tabela MAC.
13. A **menor Bridge ID**.
14. Root Port é o melhor caminho de um switch não-root para a raiz; Designated Port é a que encaminha para um segmento.
15. Nenhum encaminha dados; Learning **aprende MACs**, Blocking não.
16. Rede LAN virtual; separa **domínios de broadcast**.
17. Transporta várias VLANs pelo mesmo enlace; tag de **4 bytes**.
18. Access transporta uma VLAN de dados; trunk transporta múltiplas VLANs identificadas.
19. Gateway L3 configurado: roteador com subinterfaces ou switch L3 com SVIs/roteamento.
20. `show vlan brief`.
21. `show interfaces trunk`.
22. Associa a subinterface ao tráfego da **VLAN 20**, marcado conforme 802.1Q.
23. Trunk ausente, VLAN não permitida/criada no caminho, porta de acesso errada ou outra falha de enlace/VLAN.
24. Loop L2 potencial; em condições comuns ocorre tempestade e instabilidade.

## 15. Resumo de bolso para os últimos 15 minutos

**IPv4:** 32 bits. Rede = bits host 0; broadcast = bits host 1. `hosts=2^(32−prefixo)−2` nas sub-redes convencionais. Máscaras fundamentais: `/24=254`, `/25=126`, `/26=62`, `/27=30`, `/28=14`, `/29=6`, `/30=2`. **Salto=256−octeto da máscara** no octeto relevante.

**VLSM:** maior demanda primeiro; escolher o menor bloco que comporta os hosts; respeitar múltiplos do bloco; não sobrepor. **CIDR:** prefixos sem classes e sumarização.

**IPv6:** 128 bits, hexadecimal; `::` só uma vez; `/64` comum; não existe broadcast; NDP substitui funções do ARP.

**Switch:** aprende **origem**, encaminha por **destino**; destino desconhecido → flooding restrito à VLAN. **STP:** menor BID = Root; cada não-root possui Root Port; designated por segmento; enlaces redundantes podem bloquear.

**VLAN:** domínio de broadcast por VLAN. **Access:** uma VLAN. **Trunk:** várias VLANs; tag 802.1Q de 4 bytes, VID de 12 bits. **Inter-VLAN:** requer L3; trunk até roteador com subinterfaces ou switch L3 com SVIs.

**Cisco:** `enable`, `conf t`, `vlan 10`, `switchport mode access`, `switchport access vlan 10`, `switchport mode trunk`, `show vlan brief`, `show interfaces trunk`, `show spanning-tree`, `show mac address-table`, `copy run start`.

## 16. Atenção às fontes: detalhes que merecem cuidado

- O PDF de revisão usa a antiga faixa de Classe A como “1 a 127” e contém um exemplo que chama o IP `186.232.240.100` de Classe C. Pela classificação histórica correta, **186 é Classe B**, e **127/8 é reservado para loopback**. Estude a tabela corrigida na seção 2.
- O PDF de VLSM possui pequenas imprecisões de linguagem, como “duas redes com 254 hosts geram 512 IPs disponíveis”: o bloco agregado `/23` possui **512 endereços totais**, dos quais **510** são hosts utilizáveis na sub-rede convencional.
- Um exemplo na folha de comandos apresenta rotas estáticas para redes que já seriam diretamente conectadas: o objetivo didático é reconhecer a sintaxe de `ip route`, mas essas rotas são normalmente desnecessárias para redes diretamente conectadas.
- O arquivo `stp-....pkt` é um projeto binário do Cisco Packet Tracer. Não foi possível validar sua topologia interna com as ferramentas de leitura de documentos; o estudo de STP foi baseado no PDF de Comutação, especialmente as páginas 29–43.
- IPv6 aparece no cronograma da imagem, mas **não há slides específicos de IPv6** entre os PDFs recebidos. A seção 6 é uma complementação de fundamentos, não uma reprodução de aula.

## 17. Mapa dos arquivos usados

- `1-Modelo_TCPIP_-_VLSM.pdf` e `2-Modelo_TCPIP_-_VLSM.pdf`: 26 páginas cada, conteúdo aparentemente duplicado de VLSM, cálculo de sub-redes e prática de planejamento.
- `3-Exercicios_de_Subrede.pdf`: lista de questões (inclui VLSM e sumarização), resolvidas na seção 13.
- `4-Revisao-VLSM.pdf`: classes, máscaras, binário, endereço de rede/broadcast e identificação de sub-redes.
- `5-Comutacao.pdf`: circuitos, mensagens, pacotes, células, Ethernet, MAC, broadcast, colisões e STP/RSTP.
- `6-Comandos.pdf`: comandos básicos Cisco, VLAN, trunk, subinterfaces e exemplos de roteamento.
- `7-3.4.6_Lab_-_Configure_VLANs_and_Trunking.pdf`: laboratório Cisco para criação de VLANs e interligação trunk entre S1 e S2.
- `8-VLAN.pdf`: IEEE 802.1Q, VLANs estáticas/dinâmicas, access/trunk, VTP, riscos de VLAN hopping, arquitetura hierárquica e Inter-VLAN Routing.

**Estratégia para aprender de verdade:** após a primeira leitura, refaça os cálculos das seções 3 e 4 sem olhar, desenhe um triângulo STP identificando as portas, e escreva de memória a configuração de duas VLANs + trunk + subinterfaces. Se conseguir explicar por que cada comando existe, estará preparado para questões práticas e conceituais.
