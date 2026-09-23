import test from 'node:test';
import assert from 'node:assert/strict';
import {modelModules} from '../scripts/modules.mjs';
for(const name of modelModules)await import('../src/'+name+'.js');
const X=CSL.experiences,N=X.networkBasics,copy=structuredClone;
test('subnet applies the same mask to both addresses and /25 can change the decision',()=>{
 let s=N.subnetStart(),v=N.subnetView(s);assert.equal(v.same,true);assert.equal(L.intIp(v.networkA),'192.168.1.0');assert.equal(v.nextHop,s.peer);
 s=N.subnet(s,{kind:'configure',ip:'192.168.1.130',peer:'192.168.1.20',prefix:25});v=N.subnetView(s);assert.equal(v.same,false);assert.equal(L.intIp(v.networkA),'192.168.1.128');assert.equal(L.intIp(v.networkB),'192.168.1.0');assert.equal(v.nextHop,'192.168.1.1');
});
test('selected subnet bit explains the mask operation without mutating the addresses',()=>{
 const s=N.subnetStart(),n=N.subnet(s,{kind:'bit',index:24}),v=N.subnetView(n);assert.equal(v.selected.mask,0);assert.equal(v.selected.an,0);assert.equal(v.selected.bn,0);assert.equal(n.ip,s.ip);assert.equal(n.peer,s.peer);
});
test('subnet /0 /31 /32 stay finite and invalid input is atomic',()=>{
 for(const prefix of [0,31,32]){const s=N.subnet(N.subnetStart(),{kind:'configure',ip:'255.255.255.255',peer:'0.0.0.0',prefix});const v=N.subnetView(s);assert.ok(Number.isInteger(v.networkA));assert.ok(Number.isInteger(v.networkB));}
 const s=N.subnetStart(),old=copy(s);assert.throws(()=>N.subnet(s,{kind:'configure',ip:'999.1.1.1',peer:s.peer,prefix:24}));assert.deepEqual(s,old);
});
test('ARP same-LAN asks for final peer but remote destination asks for gateway',()=>{
 let s=N.arpStart(),v=N.arpView(s);assert.equal(v.finalIp,v.nextIp);s=N.arp(s,{kind:'destination',remote:true});v=N.arpView(s);assert.equal(v.finalIp,'203.0.113.20');assert.equal(v.nextIp,'192.168.1.1');assert.notEqual(v.finalIp,v.nextIp);
});
test('ARP request reply and frame preserve IP destination while changing L2 destination',()=>{
 let s=N.arp(N.arpStart(),{kind:'destination',remote:true});s=N.arp(s,{kind:'request'});assert.deepEqual(s.wire,{kind:'request',target:'192.168.1.1'});s=N.arp(s,{kind:'reply'});assert.equal(s.cache['192.168.1.1'],'02:00:00:00:00:01');s=N.arp(s,{kind:'send'});assert.deepEqual(s.wire,{kind:'frame',ip:'203.0.113.20',mac:'02:00:00:00:00:01'});
});
test('ARP cache hit can skip request and clear only clears the cache',()=>{
 let s=N.arp(N.arpStart(),{kind:'preset-cache'});assert.ok(N.arpView(s).cached);s=N.arp(s,{kind:'request'});assert.equal(s.wire,null);const remote=s.remote;s=N.arp(s,{kind:'clear'});assert.deepEqual(s.cache,{});assert.equal(s.remote,remote);
});
test('ARP invalid sequence is atomic',()=>{
 const s=N.arpStart(),old=copy(s);assert.throws(()=>N.arp(s,{kind:'reply'}));assert.throws(()=>N.arp(s,{kind:'send'}));assert.deepEqual(s,old);
});
test('DHCP does not install an address at OFFER or REQUEST, only at ACK',()=>{
 let s=N.dhcpStart(1,1);s=N.dhcp(s,{kind:'next'});assert.equal(s.leases[0],null);s=N.dhcp(s,{kind:'next'});assert.equal(s.offer,'192.0.2.100');assert.equal(s.leases[0],null);s=N.dhcp(s,{kind:'next'});assert.equal(s.leases[0],null);s=N.dhcp(s,{kind:'next'});assert.equal(s.leases[0],'192.0.2.100');
});
test('DHCP pool exhaustion leaves later clients unconfigured',()=>{
 let s=N.dhcpStart(3,1);for(let i=0;i<6;i++)s=N.dhcp(s,{kind:'next'});const v=N.dhcpView(s);assert.equal(s.leases[0],'192.0.2.100');assert.equal(s.leases[1],null);assert.equal(s.client,2);assert.deepEqual(v.available,[]);
});
test('DHCP zero pool gives no offer and next client can be attempted',()=>{
 let s=N.dhcpStart(2,0);s=N.dhcp(s,{kind:'next'});s=N.dhcp(s,{kind:'next'});assert.equal(s.client,1);assert.equal(s.offer,null);assert.equal(s.leases[0],null);
});
test('IPv6 expands to exactly eight blocks and computes partial-prefix groups',()=>{
 let s=N.ipv6Start(),v=N.ipv6View(s);assert.equal(v.parts.length,8);assert.deepEqual(v.parts,['2001','0db8','0012','0034','0000','0000','0000','abcd']);assert.equal(v.omitted,3);
 s=N.ipv6(s,{kind:'configure',ip:s.ip,prefix:60});v=N.ipv6View(s);assert.deepEqual(v.rows.map(r=>r.prefixBits),[16,16,16,12,0,0,0,0]);
});
test('IPv6 selected bit is tied to the same 128-bit string',()=>{
 let s=N.ipv6Start();s=N.ipv6(s,{kind:'group',index:7});s=N.ipv6(s,{kind:'bit',index:15});const v=N.ipv6View(s);assert.equal(v.absoluteBit,127);assert.equal(v.selectedValue,1);assert.equal(v.isPrefix,false);assert.equal(v.selected.bits[15],v.binary[127]);
});
test('IPv6 rejects ambiguous compression and invalid prefix atomically',()=>{
 const s=N.ipv6Start(),old=copy(s);for(const [ip,prefix] of [['2001::1::2',64],['2001:db8::1',129],['zz::1',64]])assert.throws(()=>N.ipv6(s,{kind:'configure',ip,prefix}));assert.deepEqual(s,old);
});
test('switch direct widget remains the authored first chapter',()=>{
 const d=X.find('n03-switch');assert.equal(d.chapters[0].id,'communication');assert.equal(d.chapters[0].activities[0].kind,'switch');
});
test('four reviewed lessons keep their old calculations as second chapters',()=>{
 const expected={'n04-subnet':'subnet-bits','n05-arp':'arp-next-hop','n05-dhcp':'dhcp-leases','n06-ipv6':'ipv6-expand'};
 assert.equal(X.lessons.size,314);
 for(const [id,kind] of Object.entries(expected)){const d=X.find(id);assert.equal(d.chapters.length,2);assert.equal(d.chapters[0].id,'communication');assert.equal(d.chapters[0].activities[0].kind,kind);assert.equal(d.chapters[1].id,'calculation');}
});
